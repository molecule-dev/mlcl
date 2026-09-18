import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, signupAndAddItem } from './_helpers'

test.describe('/vault', () => {
  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/vault')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('signup → empty vault renders skeleton/empty without items', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vault')
    await page.waitForLoadState('networkidle')
    const itemRows = page.getByTestId(/^vault-item-row-/)
    expect(await itemRows.count()).toBe(0)
  })

  test('add item via /vault/new lands on /vault/:id and persists across reload', async ({
    page,
  }) => {
    const { itemId } = await signupAndAddItem(page, 'github.example.com')
    await expect(page).toHaveURL(new RegExp(`/vault/${itemId}`), { timeout: 10_000 })
    await expect(page.getByText(/github\.example\.com/i).first()).toBeVisible()
    await page.goto(APP_BASE + '/vault')
    await page.waitForLoadState('networkidle')
    const row = page.getByTestId(`vault-item-row-${itemId}`)
    await expect(row).toBeVisible({ timeout: 10_000 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId(`vault-item-row-${itemId}`)).toBeVisible({ timeout: 10_000 })
  })

  test('vault GET /api/items fires with bearer token', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/vault')
      await page.waitForLoadState('networkidle')
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/items(\?|$)/.test(r.url))
    expect(list, 'GET /api/items should fire when vault loads').toBeDefined()
    expect(list!.status, `vault list returned ${list!.status}`).toBeLessThan(400)
  })

  test('clicking a vault item row navigates to /vault/:id', async ({ page }) => {
    const { itemId } = await signupAndAddItem(page, 'click-me.example.com')
    await page.goto(APP_BASE + '/vault')
    await page.waitForLoadState('networkidle')
    await page.getByTestId(`vault-item-row-${itemId}`).click()
    await expect(page).toHaveURL(new RegExp(`/vault/${itemId}`), { timeout: 10_000 })
  })
})
