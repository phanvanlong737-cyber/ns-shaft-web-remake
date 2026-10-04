import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const url = process.argv[2] ?? 'https://phanvanlong737-cyber.github.io/ns-shaft-web-remake/';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [], failures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  const response = await page.goto(url + '?test=1');
  await page.getByRole('button', { name: '开始下潜' }).waitFor();
  await page.waitForTimeout(300);
  const hookAbsent = await page.evaluate(() => !('__TEST__' in window));
  await page.getByRole('button', { name: '开始下潜' }).click();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await page.locator('#pause-screen').waitFor({ state: 'visible' });
  await page.reload();
  await page.getByRole('button', { name: '开始下潜' }).waitFor();
  const scripts = await page.locator('script[src]').evaluateAll(elements => elements.map(el => el.src));
  const report = { testedAt: new Date().toISOString(), url, status: response.status(), scripts,
    browser: await browser.version(), menuPlayPauseReload: true, productionHookAbsent: hookAbsent,
    errors, failures, passed: response.ok() && hookAbsent && !errors.length && !failures.length };
  await writeFile('docs/qa/public-smoke.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} finally { await browser.close(); }
