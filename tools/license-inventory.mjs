import { readFile, writeFile, mkdir } from 'node:fs/promises';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const rows = [['package', 'version', 'license', 'usage']];
for (const [path, item] of Object.entries(lock.packages)) {
  if (!path) continue;
  let license = item.license;
  if (!license) {
    try { license = JSON.parse(await readFile(`${path}/package.json`, 'utf8')).license; }
    catch { license = 'CHECK_PACKAGE_SOURCE'; }
  }
  rows.push([path.replace(/^node_modules\//, ''), item.version, license ?? 'CHECK_PACKAGE_SOURCE', item.dev ? 'development' : 'runtime']);
}
await mkdir('docs/qa', { recursive: true });
await writeFile('docs/qa/dependency-licenses.csv', rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n'));
console.log(`Recorded ${rows.length - 1} locked dependency licenses.`);
