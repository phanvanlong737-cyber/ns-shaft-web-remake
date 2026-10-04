import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('docs/screenshots', { recursive: true });
await mkdir('.local/demo', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5173/?test=1');
await page.waitForTimeout(400);
await page.screenshot({ path: 'docs/screenshots/menu.png', fullPage: true });
const column = page.locator('.game-column');
let held = null, bestScreenshot = false;
const count = 100;
const start = performance.now();
for (let frame = 0; frame < count; frame++) {
  if (frame === 12) {
    await page.getByRole('button', { name: '开始下潜' }).click();
    await page.evaluate(() => window.__TEST__.start(211));
  }
  if (frame > 12) {
    const snapshot = await page.evaluate(() => window.__TEST__.snapshot());
    if (snapshot.state === 'playing') {
      const world = await page.evaluate(() => window.__TEST__.world());
      const targets = world.platforms.filter(p => p.solid && p.y > world.player.y + 30 && p.type !== 'spike');
      const target = targets.sort((a, b) => a.y - b.y)[0];
      let next = null;
      if (target) {
        const delta = target.x + 50 - world.player.x - 13;
        if (Math.abs(delta) > 9) next = delta > 0 ? 'ArrowRight' : 'ArrowLeft';
        else if (world.player.supportSeq !== null && world.player.supportSeq !== undefined) {
          const support = world.platforms.find(p => p.seq === world.player.supportSeq);
          next = target.x >= support.x ? 'ArrowRight' : 'ArrowLeft';
        }
      }
      if (next !== held) { if (held) await page.keyboard.up(held); if (next) await page.keyboard.down(next); held = next; }
      if (!bestScreenshot && frame >= 23) { await page.screenshot({ path: 'docs/screenshots/gameplay.png' }); bestScreenshot = true; }
    } else if (snapshot.state === 'result' && frame < 78) {
      if (held) await page.keyboard.up(held); held = null;
      await page.getByRole('button', { name: '再试一次' }).click();
    }
  }
  await column.screenshot({ path: `.local/demo/frame_${String(frame).padStart(3, '0')}.png` });
  const due = start + (frame + 1) * 150;
  if (due > performance.now()) await page.waitForTimeout(due - performance.now());
}
if (held) await page.keyboard.up(held);
await page.goto('http://127.0.0.1:5173/');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
await browser.close();
console.log('Captured original game UI and 15-second keyboard gameplay demo (not human acceptance).');
