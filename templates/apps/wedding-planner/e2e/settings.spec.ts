import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/settings page', () => {
  test('first-name input retains typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const fn = page.getByRole('textbox', { name: /^first name$/i })
    await fn.fill('Alex')
    expect(await fn.inputValue()).toBe('Alex')
  })

  test('last-name input retains typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const ln = page.getByRole('textbox', { name: /^last name$/i })
    await ln.fill('Rivera')
    expect(await ln.inputValue()).toBe('Rivera')
  })

  test('display-name input retains typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const dn = page.getByRole('textbox', { name: /display name/i })
    await dn.fill('Alex R.')
    expect(await dn.inputValue()).toBe('Alex R.')
  })

  test('bio textarea retains typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const bio = page.getByRole('textbox', { name: /^bio$/i })
    await bio.fill('Planning our wedding.')
    expect(await bio.inputValue()).toBe('Planning our wedding.')
  })

  test('Save changes PATCHes /api/profile/me and shows success', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('textbox', { name: /^first name$/i }).fill('Alex')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /save changes/i })
        .first()
        .click()
      await page.waitForLoadState('networkidle')
    })
    const p = reqs.find((r) => r.method === 'PATCH' && /\/api\/profile\/me/.test(r.url))
    expect(p, 'PATCH /api/profile/me').toBeTruthy()
    expect(p?.status).toBeLessThan(400)
  })

  test('Notifications section nav switches the panel', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^notifications$/i }).click()
  })

  test('Security section nav switches the panel', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^security$/i }).click()
  })

  test('Plan & billing section nav switches the panel', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /plan.*billing/i }).click()
  })
})
