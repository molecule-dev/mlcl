import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('/settings', () => {
  test('renders workspace settings + integrations', async ({ page }) => {
    await signup(page, uniqueEmail('settings'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1').first()).toBeVisible()
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(0)
  })

  test('no console errors on settings load', async ({ page }) => {
    await signup(page, uniqueEmail('settings-clean'))
    const errs: string[] = []
    page.on('pageerror', (e) => errs.push(e.message))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    expect(errs).toEqual([])
  })
})
