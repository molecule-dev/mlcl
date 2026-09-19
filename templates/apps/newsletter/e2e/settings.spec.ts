/**
 * /settings — publication identity section (name + from-name) loads and
 * saves; the account form renders its sections.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('settings', () => {
  test('requires auth (redirects anonymous visitors)', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/settings')
    await expect(page).not.toHaveURL(/\/settings$/, { timeout: 15000 })
  })

  test('publication section loads the current row', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('settings-load'))
    const api = await page.request.get(`${API_BASE}/settings/publication`, {
      headers: authHeaders(accessToken),
    })
    const row = (await api.json()) as { publication_name: string; from_name: string }
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('#publication-name')).toHaveValue(row.publication_name, {
      timeout: 15000,
    })
    await expect(page.locator('#publication-from-name')).toHaveValue(row.from_name)
  })

  test('saving the publication section persists via API', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('settings-save'))
    const newName = `Publication ${Date.now()}`
    await page.goto(APP_BASE + '/settings')
    await page.locator('#publication-name').fill(newName)
    await page.locator('#publication-from-name').fill('The Spec Editor')
    await page.locator('[data-mol-id="settings-publication-save"]').click()
    await expect(page.getByText('Publication updated.').first()).toBeVisible({ timeout: 15000 })
    const api = await page.request.get(`${API_BASE}/settings/publication`, {
      headers: authHeaders(accessToken),
    })
    const row = (await api.json()) as { publication_name: string }
    expect(row.publication_name).toBe(newName)
  })

  test('account sections render', async ({ page }) => {
    await signup(page, uniqueEmail('settings-sections'))
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-mol-id="settings-publication-section"]')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText('Account Settings').first()).toBeVisible()
  })
})
