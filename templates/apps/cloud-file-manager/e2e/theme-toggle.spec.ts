import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('theme toggle', () => {
  test('clicking the theme toggle flips <html data-theme> and survives reload', async ({
    page,
  }) => {
    await signup(page)
    // Land somewhere with the toggle visible (header).
    await page.goto(APP_BASE + '/files')
    const probe = () =>
      page.evaluate(() => ({
        molTheme: document.documentElement.getAttribute('data-mol-theme'),
        molMode: document.documentElement.getAttribute('data-mol-mode'),
        dataTheme: document.documentElement.getAttribute('data-theme'),
        darkClass: document.documentElement.classList.contains('dark'),
      }))
    const before = await probe()
    await page.locator('[data-mol-id="theme-toggle"]').first().click()
    await page.waitForTimeout(400)
    const after = await probe()
    const flipped =
      after.molTheme !== before.molTheme ||
      after.molMode !== before.molMode ||
      after.dataTheme !== before.dataTheme ||
      after.darkClass !== before.darkClass
    expect(flipped, 'theme attribute should flip').toBe(true)

    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    const persisted = await probe()
    expect(persisted.molTheme).toBe(after.molTheme)
    expect(persisted.molMode).toBe(after.molMode)
  })
})
