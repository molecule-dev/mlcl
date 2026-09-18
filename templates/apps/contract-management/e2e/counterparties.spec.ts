/**
 * /counterparties — list, search, create, edit, delete CRUD via the UI.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, seedCounterparty } from './_helpers.js'

test.describe('counterparties', () => {
  test('renders heading + New button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/counterparties')
    await expect(page.getByRole('heading', { name: /Counterparties/i })).toBeVisible()
    await expect(page.locator('#new-counterparty')).toBeVisible()
  })

  test('shows empty state for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/counterparties')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/No counterparties yet/i)).toBeVisible()
  })

  test('shows seeded counterparties in the table', async ({ page }) => {
    const { accessToken } = await signup(page)
    const cp = await seedCounterparty(page, accessToken, { organization: 'Globex Corp' })
    await page.goto(APP_BASE + '/counterparties')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(cp.organization)).toBeVisible()
  })

  test('search filters the table', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedCounterparty(page, accessToken, { organization: 'Alpha Industries' })
    await seedCounterparty(page, accessToken, { organization: 'Beta Holdings' })
    await page.goto(APP_BASE + '/counterparties')
    await page.waitForLoadState('networkidle')
    await page.locator('#counterparties-search').fill('Alpha')
    await page.waitForTimeout(300)
    await expect(page.getByText('Alpha Industries')).toBeVisible()
    await expect(page.getByText('Beta Holdings')).toHaveCount(0)
  })

  test('New counterparty creates row via UI', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/counterparties')
    await page.locator('#new-counterparty').click()
    const orgName = `UI Created ${Date.now()}`
    await page.locator('#cp-organization').fill(orgName)
    await page.locator('#cp-contact-name').fill('Test Contact')
    await page.locator('#cp-contact-email').fill('contact@test.dev')
    await page.locator('#cp-save').click()
    await expect(page.getByText(orgName)).toBeVisible({ timeout: 10_000 })
  })

  test('Edit counterparty updates the row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const cp = await seedCounterparty(page, accessToken, { organization: 'Original Name' })
    await page.goto(APP_BASE + '/counterparties')
    await page.waitForLoadState('networkidle')
    const row = page.locator(`[data-testid="counterparty-row-${cp.id}"]`)
    await row.getByRole('button', { name: /Edit/i }).click()
    await page.locator('#cp-organization').fill('Updated Name')
    await page.locator('#cp-save').click()
    await expect(page.getByText('Updated Name')).toBeVisible({ timeout: 10_000 })
  })

  test('Delete counterparty removes the row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const cp = await seedCounterparty(page, accessToken, { organization: 'To Delete' })
    page.on('dialog', (d) => d.accept())
    await page.goto(APP_BASE + '/counterparties')
    await page.waitForLoadState('networkidle')
    const row = page.locator(`[data-testid="counterparty-row-${cp.id}"]`)
    await row.getByRole('button', { name: /Delete/i }).click()
    await expect(row).toHaveCount(0, { timeout: 10_000 })
  })
})
