import { test, expect } from '@playwright/test';
import { createCatalog } from '../../packages/game-core/v3/index.js';
const catalog = createCatalog();
async function plan(page, id) {
  await page.locator('#board').focus();
  for (const a of catalog.get(id).solution.actions)
    await page.keyboard.press(`Arrow${a.direction[0].toUpperCase()}${a.direction.slice(1)}`);
}
async function complete(page, id) {
  await plan(page, id);
  await expect(page.locator('#go')).toBeEnabled();
  await page.locator('#go').click();
  await expect(page.locator('#result')).toBeVisible();
}
test('tutorials, reversible royal delivery, playback, retry and saved personal best', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#title')).toHaveText('First steps home');
  await expect(page.locator('#go')).toBeDisabled();
  await page.locator('[data-direction="right"]').click();
  await page.locator('[data-direction="left"]').click();
  await expect(page.locator('#moves')).toHaveText('2');
  await page.locator('#undo').click();
  await expect(page.locator('#moves')).toHaveText('1');
  await page.locator('#clear').click();
  await complete(page, 'first-steps');
  await page.locator('#next').click();
  await complete(page, 'a-royal-request');
  await page.locator('#next').click();
  await plan(page, 'royal-garden');
  await expect(page.locator('#objectives .done')).toHaveCount(3);
  await page.locator('#undo').click();
  await page.locator('#undo').click();
  await page.locator('#undo').click();
  await expect(page.locator('#objectives .done')).toHaveCount(1);
  await expect(page.locator('#mocha')).toContainText('Bring that');
  await page.locator('#clear').click();
  await expect(page.locator('#objectives .done')).toHaveCount(0);
  await plan(page, 'royal-garden');
  await page.locator('#go').click();
  await page.locator('#pause').click();
  await expect(page.locator('#pause-cover')).toBeVisible();
  const dog = await page.locator('#dog').getAttribute('transform');
  await page.waitForTimeout(400);
  expect(await page.locator('#dog').getAttribute('transform')).toBe(dog);
  await expect(page.locator('#go')).toBeDisabled();
  await page.locator('#resume').click();
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#best')).toHaveText('10');
  await expect(page.locator('#attempts')).toHaveText('1');
  await page.locator('#retry').click();
  await expect(page.locator('#moves')).toHaveText('0');
  await page.reload();
  await expect(page.locator('#title')).toHaveText('The Royal Garden');
  await expect(page.locator('#best')).toHaveText('10');
  expect(errors).toEqual([]);
});
test('mobile pointer route, blocked passage and responsive layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const r = await page.locator('#board').boundingBox(),
    cell = r.width / 3;
  await page.mouse.move(r.x + cell / 2, r.y + cell / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + cell * 2.5, r.y + cell / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('#moves')).toHaveText('2');
  await page.locator('[data-direction="right"]').click();
  await expect(page.locator('#moves')).toHaveText('2');
  await expect(page.locator('#feedback')).toContainText('closed');
  await page.locator('[data-direction="down"]').click();
  await page.locator('[data-direction="down"]').click();
  await page.locator('#go').click();
  await expect(page.locator('#result')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
