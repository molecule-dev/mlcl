/**
 * /categories — list + CRUD via /api/categories. Form lets the user
 * pick a name, icon, and color. Edit / delete buttons sit on each row.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedCategory, signup } from './_helpers.js'

test.describe('categories page', () => {
  test('renders heading + initial GET /api/categories', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/categories')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.getByRole('heading', { name: /categories|tags/i }).first()).toBeVisible()
    const got = reqs.find((r) => /\/api\/categories(?:\?|$)/.test(r.url) && r.status === 200)
    expect(got).toBeTruthy()
  })

  test('"New category" reveals the form with name + icons + colors', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/categories')
    await page.getByRole('button', { name: /new category/i }).click()
    await expect(page.locator('#category-name')).toBeVisible()
    // Icon/color pickers carry humanized accessible names ("Icon: code",
    // "Color: #2563eb") — not raw `icon-<name>`/`color-<hex>` strings.
    await expect(page.getByRole('button', { name: /^icon:/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^color: #/i }).first()).toBeVisible()
  })

  test('creating a category persists it (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const name = 'Snippets ' + Date.now()
    await page.goto(APP_BASE + '/categories')
    await page.getByRole('button', { name: /new category/i }).click()
    await page.locator('#category-name').fill(name)
    await page.getByRole('button', { name: /create category/i }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 })
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/categories', {
      headers: { Authorization: 'Bearer ' + accessToken },
    })
    const rows = (await res.json()) as Array<{ name: string }>
    expect(rows.find((r) => r.name === name)).toBeTruthy()
  })

  test('editing a category writes the new name back', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedCategory(page, accessToken, { name: 'Old Name ' + Date.now() })
    await page.goto(APP_BASE + '/categories')
    await page
      .getByText(seeded.name)
      .first()
      .click({ trial: true })
      .catch(() => {})
    await page
      .locator('div', { hasText: seeded.name })
      .last()
      .getByRole('button', { name: /^edit$/i })
      .first()
      .click()
    const newName = 'Renamed ' + Date.now()
    await page.locator('#category-name').fill(newName)
    await page.getByRole('button', { name: /save changes/i }).click()
    await page.waitForLoadState('networkidle')
    const res = await page.request.get(
      APP_BASE.replace(/\/$/, '') + '/api/categories/' + seeded.id,
      { headers: { Authorization: 'Bearer ' + accessToken } },
    )
    const fresh = (await res.json()) as { name: string }
    expect(fresh.name).toBe(newName)
  })

  test('deleting a category removes it from the DB', async ({ page }) => {
    const { accessToken } = await signup(page)
    const seeded = await seedCategory(page, accessToken, { name: 'Doomed ' + Date.now() })
    await page.goto(APP_BASE + '/categories')
    await page
      .locator('div', { hasText: seeded.name })
      .last()
      .getByRole('button', { name: /^delete$/i })
      .first()
      .click()
    // Two-step inline confirm (shared ConfirmButton): arm, wait for the
    // armed state, then confirm — one element carries all states, so the
    // armed button is the same data-mol-id with data-state="armed".
    const confirmBtn = page.locator('[data-mol-id="category-delete"][data-state="armed"]')
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()
    await page.waitForLoadState('networkidle')
    const res = await page.request.get(
      APP_BASE.replace(/\/$/, '') + '/api/categories/' + seeded.id,
      { headers: { Authorization: 'Bearer ' + accessToken }, failOnStatusCode: false },
    )
    expect(res.status()).toBe(404)
  })

  test('empty-state copy is shown for a brand-new account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/categories')
    await expect(page.getByText(/no categories yet/i)).toBeVisible({ timeout: 15000 })
  })
})
