/**
 * /sources — Engram data sources / connectors.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, createSource, signup } from './_helpers.js'

test.describe('sources', () => {
  test('add-button toggles the add-source form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sources')
    await page.locator('[data-testid="sources-add-button"]').click()
    await expect(page.locator('[data-testid="sources-add-form"]')).toBeVisible()
  })

  test('kind combobox can be changed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sources')
    await page.locator('[data-testid="sources-add-button"]').click()
    await page.locator('[data-testid="sources-add-kind"]').selectOption('url')
    await expect(page.locator('[data-testid="sources-add-kind"]')).toHaveValue('url')
  })

  test('label input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sources')
    await page.locator('[data-testid="sources-add-button"]').click()
    await page.locator('[data-testid="sources-add-label"]').fill('Marketing site')
    await expect(page.locator('[data-testid="sources-add-label"]')).toHaveValue('Marketing site')
  })

  test('submit POSTs /api/sources and the new row appears', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sources')
    await page.locator('[data-testid="sources-add-button"]').click()
    // Use kind=upload so the URL field is not required.
    await page.locator('[data-testid="sources-add-kind"]').selectOption('upload')
    const label = `Source ${Date.now()}`
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="sources-add-label"]').fill(label)
      await page.locator('[data-testid="sources-add-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => /\/api\/sources\/?$/.test(r.url) && r.method === 'POST')
    expect(post?.status).toBe(201)
    await expect(page.getByText(label)).toBeVisible()
  })

  test('empty state is visible when the user has no sources', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sources')
    await expect(page.locator('[data-testid="sources-empty"]')).toBeVisible()
  })

  test('after a direct API source-create, sources-list is visible', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createSource(page, accessToken, { label: 'Direct API source' })
    await page.goto(APP_BASE + '/sources')
    await expect(page.locator('[data-testid="sources-list"]')).toBeVisible()
    await expect(page.getByText('Direct API source')).toBeVisible()
  })
})
