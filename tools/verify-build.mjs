import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve('dist');
const prefix = '/ns-shaft-web-remake/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!path.startsWith(prefix)) { response.writeHead(404); response.end(); return; }
    let file = resolve(root, path.slice(prefix.length) || 'index.html');
    if (!file.startsWith(root + sep)) throw Error('outside build');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}${prefix}`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [], failures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  await page.goto(base + '?test=1');
  await page.getByRole('button', { name: '开始下潜' }).waitFor();
  await page.waitForTimeout(300);
  if (await page.evaluate(() => '__TEST__' in window)) throw Error('Development hook leaked into production');
  await page.getByRole('button', { name: '开始下潜' }).click();
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(500); await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('Space');
  await page.locator('#pause-screen').waitFor({ state: 'visible' });
  await page.reload(); await page.getByRole('button', { name: '开始下潜' }).waitFor();
  const report = { passed: !errors.length && !failures.length, prefix, productionHookAbsent: true,
    menuPlayPauseReload: true, browser: await browser.version(), errors, failures };
  await mkdir('docs/qa', { recursive: true });
  await writeFile('docs/qa/build-smoke.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
