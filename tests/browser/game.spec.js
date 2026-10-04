import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.getByRole('button', { name: '开始下潜' })).toBeVisible();
});

test('menu, play, simultaneous inputs, pause and restart', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('button', { name: '开始下潜' }).click();
  await expect(page.locator('#menu-screen')).toBeHidden();
  await page.keyboard.down('ArrowLeft'); await page.keyboard.down('ArrowRight');
  const position = await page.evaluate(() => window.__TEST__.snapshot().x);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.__TEST__.snapshot().x)).toBeCloseTo(position, 3);
  await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('Space'); await expect(page.locator('#pause-screen')).toBeVisible();
  const frozen = await page.evaluate(() => window.__TEST__.snapshot());
  await page.waitForTimeout(150);
    const after = await page.evaluate(() => window.__TEST__.snapshot());
    for (const key of ['state', 'hp', 'floor', 'runTime', 'x', 'y', 'input', 'platformCount']) expect(after[key]).toEqual(frozen[key]);
  await page.getByRole('button', { name: '继续下潜' }).click();
  await expect(page.locator('#pause-screen')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '重新开始', exact: true }).click();
  expect(await page.evaluate(() => window.__TEST__.snapshot().floor)).toBe(0);
  await expect(page.locator('#hp-label')).toHaveText('10 / 10');
  expect(errors).toEqual([]);
});

test('settings pause play, persist across reload and close without auto-resume', async ({ page }) => {
  await page.getByRole('button', { name: '开始下潜' }).click();
  await page.getByRole('button', { name: '设置', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('静音', { exact: true }).check();
  await page.getByLabel('减少动画', { exact: true }).check();
  await page.getByRole('button', { name: '关闭面板' }).click();
  await expect(page.locator('#pause-screen')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '设置', exact: true }).first().click();
  await expect(page.getByLabel('静音', { exact: true })).toBeChecked();
  await expect(page.getByLabel('减少动画', { exact: true })).toBeChecked();
});

test('result submits once, renders nickname as text and preserves local best', async ({ page }) => {
  await page.getByRole('button', { name: '开始下潜' }).click();
  await page.evaluate(() => { window.__TEST__.milestone(); window.__TEST__.die('fall'); });
  await expect(page.locator('#result-screen')).toBeVisible();
  await page.getByLabel('排行榜昵称').fill('<img src=x>');
  await page.getByRole('button', { name: '记录成绩', exact: true }).click();
  await expect(page.locator('#submit-score')).toBeDisabled();
  await page.getByRole('button', { name: '返回菜单', exact: true }).last().click();
  await page.getByRole('button', { name: '排行榜', exact: false }).first().click();
  await expect(page.locator('.leaderboard strong')).toHaveText('<img src=x>');
  await expect(page.locator('.leaderboard img')).toHaveCount(0);
  await page.reload(); await expect(page.locator('#best')).toHaveText('100');
});

test('storage denial does not interrupt game or in-memory scores', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } });
  });
  await page.reload(); await page.getByRole('button', { name: '开始下潜' }).click();
  await page.evaluate(() => window.__TEST__.die('hp'));
  await expect(page.locator('#result-screen')).toBeVisible();
  await page.getByRole('button', { name: '记录成绩', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('无法持久保存');
  await page.getByRole('button', { name: '再试一次' }).click();
  await expect(page.locator('#menu-screen')).toBeHidden();
});

test('blur pauses and clears held movement', async ({ page }) => {
  await page.getByRole('button', { name: '开始下潜' }).click();
  await page.keyboard.down('ArrowLeft');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#pause-screen')).toBeVisible();
  expect(await page.evaluate(() => window.__TEST__.snapshot().input)).toEqual({ left: false, right: false });
  await page.keyboard.up('ArrowLeft');
});

for (const [direction, steps] of [['right', 57], ['left', 33]]) {
  test(`spike ${direction} edge departure preserves five HP and never shows death`, async ({ page }) => {
    const snapshot = await page.evaluate(({ direction, steps }) => {
      window.__TEST__.spikeEdge();
      window.__TEST__.tick(130 / 120, {});
      window.__TEST__.tick(steps / 120, { [direction]: true });
      const state = window.__TEST__.snapshot();
      window.dispatchEvent(new Event('blur'));
      return state;
    }, { direction, steps });
    expect(snapshot.state).toBe('playing'); expect(snapshot.hp).toBe(5);
    expect(snapshot.reason).toBeNull();
    await expect(page.locator('#hp-label')).toHaveText('5 / 10');
    await expect(page.locator('#hp')).toHaveAttribute('aria-valuenow', '5');
    await expect(page.locator('#hp i.empty')).toHaveCount(5);
    await expect(page.locator('#result-screen')).toBeHidden();
    await expect(page.locator('#pause-screen')).toBeVisible();
  });
}

test('viewport keeps physical aspect ratio and no horizontal overflow', async ({ page }) => {
  for (const size of [{ width: 1280, height: 720 }, { width: 960, height: 540 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    const box = await page.locator('canvas').boundingBox();
    expect(box.width / box.height).toBeCloseTo(0.75, 3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const button = await page.getByRole('button', { name: '开始下潜' }).boundingBox();
    expect(button.width).toBeGreaterThan(100);
  }
});

test('touch pointer cancellation releases movement', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Touch UI only');
  await page.getByRole('button', { name: '开始下潜' }).click();
  const left = page.getByRole('button', { name: '向左移动', exact: true });
  const box = await left.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  expect(await page.evaluate(() => window.__TEST__.snapshot().input.left)).toBe(true);
  await left.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
  expect(await page.evaluate(() => window.__TEST__.snapshot().input.left)).toBe(false);
  await page.mouse.up();
});

test('all original assets load and audio starts only after a gesture', async ({ page }) => {
  const failures = [];
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  await page.reload();
  expect(await page.evaluate(() => window.__TEST__.snapshot().audioNodes)).toBe(0);
  await page.getByRole('button', { name: '开始下潜' }).click();
  await expect.poll(() => page.evaluate(() => window.__TEST__.snapshot().audioNodes)).toBeGreaterThan(0);
  const snapshot = await page.evaluate(() => window.__TEST__.snapshot());
  expect(snapshot.audioNodes).toBeGreaterThan(0);
  expect(snapshot.audioNodes).toBeLessThan(20);
  for (const asset of ['player', 'background', 'platform_normal', 'platform_spike', 'platform_fake',
    'platform_spring', 'platform_conveyorLeft', 'platform_conveyorRight', 'logo']) {
    const response = await page.request.get(`/assets/${asset}.svg`);
    expect(response.ok()).toBe(true); expect(await response.text()).toContain('<svg');
  }
  expect(failures).toEqual([]);
});

test('reduced motion and sound settings do not change seeded rule results', async ({ page }) => {
  const results = [];
  for (const reduced of [false, true]) {
    await page.getByRole('button', { name: '设置', exact: true }).first().click();
    await page.getByLabel('减少动画', { exact: true }).setChecked(reduced);
    await page.getByLabel('静音', { exact: true }).setChecked(reduced);
    await page.getByRole('button', { name: '关闭面板' }).click();
    const snapshot = await page.evaluate(() => {
      window.__TEST__.start(511);
      window.__TEST__.tick(1, { right: true });
      window.dispatchEvent(new Event('blur'));
      const state = window.__TEST__.snapshot();
      return { floor: state.floor, hp: state.hp, runTime: state.runTime, x: state.x, y: state.y };
    });
    results.push(snapshot);
    await page.getByRole('button', { name: '返回菜单', exact: true }).first().click();
  }
  expect(results[0]).toEqual(results[1]);
});

test('repeated restarting never multiplies input actions', async ({ page }) => {
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => window.__TEST__.start(1));
    await page.keyboard.press('Space');
    await expect(page.locator('#pause-screen')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.locator('#pause-screen')).toBeHidden();
  }
});
