import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function exported(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this puzzle' }).click();
  const file = await download;
  return JSON.parse(await readFile((await file.path())!, 'utf8'));
}
test('settings, switches, keyboard route, Go, result and saved progress', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('combobox').selectOption('5');
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('switch', { name: 'Royal delivery' }).click();
  await page.getByRole('switch', { name: 'Key & gate' }).click();
  await page.getByRole('button', { name: 'Generate puzzle', exact: true }).click();
  await expect(page.locator('.play-header h2')).toContainText('5 × 5');
  const level = await exported(page);
  expect(level.config.delivery).toBe(false);
  expect(level.config.keys).toBe(false);
  const maze = page.getByRole('application');
  await maze.focus();
  let previous = 0;
  for (const cell of level.solution) {
    const delta = cell - previous;
    await page.keyboard.press(
      delta === 1
        ? 'ArrowRight'
        : delta === -1
          ? 'ArrowLeft'
          : delta === level.n
            ? 'ArrowDown'
            : 'ArrowUp',
    );
    previous = cell;
  }
  await expect(page.getByRole('button', { name: 'Go', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Go', exact: true })).toBeDisabled();
  await maze.focus();
  const delta = level.goal - level.solution.at(-2);
  await page.keyboard.press(delta === 1 ? 'ArrowRight' : 'ArrowDown');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('Perfect route');
  await expect(page.locator('.campaign-progress strong')).toHaveText('1');
  await page.reload();
  await expect(page.locator('.campaign-progress strong')).toHaveText('1');
  expect(errors).toEqual([]);
});
test('help traps focus, Escape closes it and timed play stays paused', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Timed · 60s' }).click();
  await expect(page.getByRole('application')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start challenge' }).click();
  await page.getByRole('button', { name: 'How to play' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const time = await page.locator('.stats strong').nth(1).textContent();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
      true,
    );
  }
  await page.waitForTimeout(1100);
  expect(await page.locator('.stats strong').nth(1).textContent()).toBe(time);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resume puzzle' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume puzzle' }).click();
  await expect(page.getByRole('application')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show one optimal solution' })).toBeDisabled();
});
test('mobile assets, direction controls, assisted result and no overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const level = await exported(page);
  const first = level.edges[0][0];
  await page
    .getByRole('button', { name: first === 1 ? 'Move right' : 'Move down', exact: true })
    .click();
  await expect(page.locator('.stats strong').first()).toHaveText('1 moves');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.stats strong').first()).toHaveText('0 moves');
  await page.getByRole('button', { name: 'Show one optimal solution' }).click();
  await expect(page.locator('.board-caption')).toContainText('Assisted');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.locator('.feedback')).toContainText('Assisted solution');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await page
      .locator('.mocha-note img')
      .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
  ).toBe(true);
});
