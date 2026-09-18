import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/lessons', () => {
  test('renders the lessons heading and at least one lesson card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/lessons')
    await expect(page.getByRole('heading').first()).toBeVisible()
    const links = page.locator('a[href^="/lessons/"]')
    await links.first().waitFor({ timeout: 10000 })
    await expect(links.first()).toBeAttached()
  })

  test('GET /api/lessons fires on page load and returns 200', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/lessons')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const get = whereUrl(reqs, /\/api\/lessons(?:\?|$)/, 'GET')
    expect(get.length, 'GET /api/lessons fired').toBeGreaterThan(0)
    expect(get[0].status, 'lessons status').toBe(200)
  })

  test('clicking a lesson card navigates to /lessons/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/lessons')
    const link = page.locator('a[href^="/lessons/"]').first()
    await link.waitFor({ timeout: 10000 })
    const href = await link.getAttribute('href')
    await link.click()
    await expect(page).toHaveURL(new RegExp(href!))
  })
})
