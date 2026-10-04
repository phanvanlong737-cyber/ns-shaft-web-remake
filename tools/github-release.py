"""Publish this project using an existing Git credential; never print or persist it."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / '.local' / 'github-release.json'


def credential():
    env = dict(os.environ, GIT_TERMINAL_PROMPT='0', GCM_INTERACTIVE='never')
    result = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n',
                            text=True, capture_output=True, env=env, timeout=20, cwd=ROOT)
    fields = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
    token = fields.get('password')
    if not token:
        raise RuntimeError('No existing GitHub credential is available')
    return token


def api(token, path, method='GET', body=None):
    headers = {'Authorization': 'Bearer ' + token, 'User-Agent': 'ns-shaft-web-remake-release',
               'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}
    payload = json.dumps(body).encode('utf-8') if body is not None else None
    request = urllib.request.Request('https://api.github.com' + path, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read()
            return response.status, json.loads(data) if data else {}
    except urllib.error.HTTPError as error:
        data = json.loads(error.read().decode('utf-8'))
        return error.code, {'message': data.get('message'), 'errors': data.get('errors')}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['prepare', 'pages', 'status', 'release'])
    args = parser.parse_args()
    token = credential()
    if args.action == 'prepare':
        if STATE.exists():
            print(STATE.read_text(encoding='utf-8'))
            return
        code, profile = api(token, '/user')
        if code != 200:
            raise RuntimeError('Cannot verify current GitHub identity')
        owner = profile['login']
        for name in ['ns-shaft-web-remake', 'ns-shaft-web-remake-course']:
            code, _ = api(token, f'/repos/{owner}/{name}')
            if code == 404:
                break
            if code != 200:
                raise RuntimeError('Cannot check repository name availability')
        else:
            raise RuntimeError('Both planned repository names exist; refusing to overwrite either')
        code, result = api(token, '/user/repos', 'POST', {
            'name': name, 'description': '下100层：原创微霓虹美术、经典街机玩法、确定性规则与自动化测试的Web重制版',
            'private': False, 'auto_init': False,
        })
        if code != 201:
            print(json.dumps({'status': code, 'result': result}, ensure_ascii=True))
            raise RuntimeError('Repository creation failed')
        data = {'owner': owner, 'repository': name, 'url': result['html_url'],
                'gitUrl': result['clone_url'], 'pagesUrl': f'https://{owner}.github.io/{name}/'}
        STATE.parent.mkdir(exist_ok=True)
        STATE.write_text(json.dumps(data, indent=2), encoding='utf-8')
        print(json.dumps(data))
        return
    data = json.loads(STATE.read_text(encoding='utf-8'))
    base = f"/repos/{data['owner']}/{data['repository']}"
    if args.action == 'pages':
        code, result = api(token, base + '/pages')
        if code == 404:
            code, result = api(token, base + '/pages', 'POST', {'build_type': 'workflow'})
        elif code == 200 and result.get('build_type') != 'workflow':
            code, result = api(token, base + '/pages', 'PUT', {'build_type': 'workflow'})
        print(json.dumps({'status': code, 'pagesUrl': result.get('html_url'), 'message': result.get('message')}))
    elif args.action == 'status':
        code, result = api(token, base + '/actions/runs?per_page=3')
        runs = [{'id': run['id'], 'sha': run['head_sha'], 'status': run['status'],
                 'conclusion': run['conclusion'], 'url': run['html_url']} for run in result.get('workflow_runs', [])]
        pages_code, pages = api(token, base + '/pages')
        print(json.dumps({'status': code, 'runs': runs, 'pagesStatus': pages_code,
                          'pagesUrl': pages.get('html_url')}, indent=2))
    elif args.action == 'release':
        tag = 'v1.0.0-rc.1'
        code, result = api(token, base + '/releases/tags/' + tag)
        if code == 404:
            body = (ROOT / 'docs' / 'release-notes.md').read_text(encoding='utf-8')
            code, result = api(token, base + '/releases', 'POST', {'tag_name': tag,
                'target_commitish': 'main', 'name': '下100层 v1.0.0-rc.1', 'body': body,
                'draft': False, 'prerelease': True})
        print(json.dumps({'status': code, 'releaseUrl': result.get('html_url'), 'message': result.get('message')}))


if __name__ == '__main__':
    main()
