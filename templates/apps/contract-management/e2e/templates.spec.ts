/**
 * /templates — list, navigate to editor (new + edit), CRUD via UI.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, seedTemplate } from './_helpers.js'

test.describe('templates', () => {
  test('renders heading + New template button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await expect(page.getByRole('heading', { name: /Templates/i })).toBeVisible()
    await expect(page.locator('#new-template')).toBeVisible()
  })

  test('shows empty state for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/No templates yet/i)).toBeVisible()
  })

  test('shows seeded templates', async ({ page }) => {
    const { accessToken } = await signup(page)
    const tmpl = await seedTemplate(page, accessToken, { name: 'Standard MSA' })
    await page.goto(APP_BASE + '/templates')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(tmpl.name)).toBeVisible()
  })

  test('New template button navigates to /templates/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await page.locator('#new-template').click()
    await page.waitForURL('**/templates/new', { timeout: 5_000 })
    await expect(page.locator('#tmpl-name')).toBeVisible()
  })

  test('creates new template via /templates/new form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates/new')
    const name = `UI Template ${Date.now()}`
    await page.locator('#tmpl-name').fill(name)
    await page.locator('#tmpl-description').fill('Created via E2E')
    await page.locator('#tmpl-content').fill('Hello {{counterparty}}, {{date}}')
    await page.locator('#save-template').click()
    await page.waitForURL(/\/templates\/(?!new)[0-9a-f-]+/, { timeout: 10_000 })
    await expect(page.locator('#tmpl-name')).toHaveValue(name)
  })

  test('Edit template updates name + content', async ({ page }) => {
    const { accessToken } = await signup(page)
    const tmpl = await seedTemplate(page, accessToken, { name: 'Original Tpl' })
    await page.goto(`${APP_BASE}/templates/${tmpl.id}`)
    await page.waitForLoadState('networkidle')
    await page.locator('#tmpl-name').fill('Renamed Tpl')
    await page.locator('#save-template').click()
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 10_000 })
    await page.goto(APP_BASE + '/templates')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Renamed Tpl')).toBeVisible()
  })

  test('Use template links to /contracts/new with template param', async ({ page }) => {
    const { accessToken } = await signup(page)
    const tmpl = await seedTemplate(page, accessToken, { name: 'Use Me' })
    await page.goto(APP_BASE + '/templates')
    await page.waitForLoadState('networkidle')
    const useLink = page.locator(`a[href="/contracts/new?template=${tmpl.id}"]`)
    await expect(useLink).toBeVisible()
  })

  test('detected variables badge appears when content has {{var}}', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates/new')
    await page.locator('#tmpl-name').fill('Var Detector')
    await page.locator('#tmpl-content').fill('Dear {{customerName}}, regarding {{address}}')
    // The badge is a span (not the textarea) — match exact and find span.
    await expect(page.locator('span.font-mono', { hasText: '{{customerName}}' })).toBeVisible()
    await expect(page.locator('span.font-mono', { hasText: '{{address}}' })).toBeVisible()
  })

  test('Delete template removes it from list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const tmpl = await seedTemplate(page, accessToken, { name: 'To Delete Tpl' })
    page.on('dialog', (d) => d.accept())
    await page.goto(`${APP_BASE}/templates/${tmpl.id}`)
    await page.waitForLoadState('networkidle')
    await page.locator('#delete-template').click()
    await page.waitForURL('**/templates', { timeout: 10_000 })
    await expect(page.getByText('To Delete Tpl')).toHaveCount(0)
  })
})
