import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';

const durationSeconds = Number(process.argv[2] ?? 600);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://127.0.0.1:5173/?test=1');
await page.getByRole('button', { name: '开始下潜' }).click();
const session = await page.context().newCDPSession(page);
await session.send('Performance.enable');
const start = performance.now(), samples = [];
let restarts = 0, held = null;
const targetFor = world => {
  const hero = world.player;
  const targets = world.platforms.filter(platform => platform.solid &&
    platform.seq > (hero.supportSeq ?? -1) && platform.y > hero.y + 30 && platform.type !== 'spike');
  return targets.sort((a, b) => a.y - b.y)[0];
};
while (performance.now() - start < durationSeconds * 1000) {
  const snapshot = await page.evaluate(() => window.__TEST__.snapshot());
  if (snapshot.state === 'result') {
    if (held) await page.keyboard.up(held);
    held = null;
    await page.getByRole('button', { name: '再试一次' }).click(); restarts++;
  } else {
    const world = await page.evaluate(() => window.__TEST__.world());
    const target = targetFor(world);
    let nextKey = null;
    if (target) {
      const delta = target.x + target.width / 2 - world.player.x - 13;
      if (Math.abs(delta) > 9) nextKey = delta > 0 ? 'ArrowRight' : 'ArrowLeft';
      // On a support, walk to the edge rather than waiting to be carried to the ceiling.
      if (world.player.supportSeq !== undefined && world.player.supportSeq !== null) {
        const support = world.platforms.find(platform => platform.seq === world.player.supportSeq);
        if (support && Math.abs(delta) <= 9) nextKey = target.x >= support.x ? 'ArrowRight' : 'ArrowLeft';
      }
    }
    if (held !== nextKey) {
      if (held) await page.keyboard.up(held);
      if (nextKey) await page.keyboard.down(nextKey);
      held = nextKey;
    }
  }
  if (!samples.length || performance.now() - start > samples.length * 1000) {
    const { metrics } = await session.send('Performance.getMetrics');
    const metricsMap = Object.fromEntries(metrics.map(metric => [metric.name, metric.value]));
    samples.push({ seconds: (performance.now() - start) / 1000, ...snapshot,
      heapBytes: metricsMap.JSHeapUsedSize, nodes: metricsMap.Nodes,
      listeners: metricsMap.JSEventListeners });
  }
  await page.waitForTimeout(80);
}
const report = {
  testedAt: new Date().toISOString(), durationSeconds, elapsedSeconds: (performance.now() - start) / 1000,
  kind: 'Real wall-clock browser simulation with keyboard controller; not human gameplay acceptance',
  browser: await browser.version(), os: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0]?.model,
  viewport: '1280x720', restarts, errors,
  maxPlatforms: Math.max(...samples.map(sample => sample.platformCount)),
  maxParticles: Math.max(...samples.map(sample => sample.particleCount)),
  maxAudioNodes: Math.max(...samples.map(sample => sample.audioNodes)),
  maxDomNodes: Math.max(...samples.map(sample => sample.nodes)),
  minListeners: Math.min(...samples.map(sample => sample.listeners)),
  maxListeners: Math.max(...samples.map(sample => sample.listeners)),
  averageFps: (samples.at(-1).renderedFrames - samples[0].renderedFrames) /
    (samples.at(-1).seconds - samples[0].seconds), samples,
};
await mkdir('docs/qa', { recursive: true });
await writeFile('docs/qa/soak.json', JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify({ ...report, samples: `${samples.length} samples stored in docs/qa/soak.json` }, null, 2));
if (errors.length || report.maxPlatforms > 14 || report.maxParticles > 180 || report.maxAudioNodes > 32) process.exitCode = 1;
