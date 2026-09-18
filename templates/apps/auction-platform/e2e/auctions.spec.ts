import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/auctions', () => {
  test('renders Browse auctions heading after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/auctions')
    await expect(page.getByRole('heading', { name: /Browse auctions/i, level: 1 })).toBeVisible()
  })

  test('search box accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/auctions')
    const sb = page.getByRole('searchbox').first()
    await sb.fill('rolex')
    await expect(sb).toHaveValue('rolex')
  })

  test('sort dropdown changes selection', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/auctions')
    const sort = page.getByRole('combobox', { name: /Sort by/i })
    await sort.selectOption({ label: 'Newest' })
    await expect(sort).toHaveValue(/newest/i)
  })

  test('Fine art category button clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/auctions')
    await expect(page.getByRole('button', { name: /Fine art/i })).toBeEnabled()
  })

  test('Watches category button clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/auctions')
    await expect(page.getByRole('button', { name: /Watches/i })).toBeEnabled()
  })

  test('sidebar Browse link present and active', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/auctions')
    await expect(page.getByRole('link', { name: /^Browse$/i }).first()).toBeVisible()
  })

  test('page load fetches /api/auctions', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/auctions')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/auctions/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })
})
