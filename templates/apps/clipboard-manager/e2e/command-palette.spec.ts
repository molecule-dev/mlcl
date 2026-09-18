/**
 * /command-palette — keyboard-shortcut-first marketing/help page.
 * Renders a static palette mockup, an editable query input that
 * round-trips to local state, and a shortcut-table with the
 * canonical Yank chord set.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('command palette page', () => {
  test('heading + ⌘K hint render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/command-palette')
    await expect(page.getByRole('heading', { name: /command palette/i, level: 1 })).toBeVisible()
    await expect(page.getByText(/try it on a real keyboard/i)).toBeVisible()
  })

  test('editing the demo query input updates the input value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/command-palette')
    const input = page.locator('input[type="search"]').first()
    await input.fill('docker run')
    await expect(input).toHaveValue('docker run')
  })

  test('shortcut table lists all eight default actions', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/command-palette')
    for (const label of [
      /open palette/i,
      /navigate results/i,
      /paste selected/i,
      /pin selected/i,
      /encrypt selected/i,
      /delete selected/i,
      /filter by category/i,
      /close palette/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible()
    }
  })
})
