import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiFetch, captureNetwork, signup } from './_helpers'

// /integrations — list of connected secret-store integrations (vercel,
// aws, gcp, azure, doppler). POST /api/integrations creates a row;
// POST /api/integrations/:id/sync flips status to 'connected'.

test.describe('/integrations', () => {
  test('renders empty state for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/integrations')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-mol-id="integrations-empty"]')).toBeVisible()
  })

  test('add-integration form POSTs /api/integrations and renders the card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/integrations')
    await page.locator('[data-mol-id="integrations-add-toggle"]').click()
    await page.locator('[data-mol-id="integration-name"]').fill('Vercel · Production')
    await page.locator('[data-mol-id="integration-category"]').selectOption('vercel')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="integration-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/integrations(\b|\?|$)/.test(r.url))
    expect(post, 'POST /api/integrations should fire').toBeDefined()
    expect(post!.status).toBe(201)
    await expect(page.locator('[data-mol-id="integrations-list"]')).toBeVisible()
    // Confirm DB truth.
    const list = await apiFetch(page, 'GET', '/integrations')
    const arr = list.json as Array<{ name: string; category: string }>
    expect(arr.some((i) => i.name === 'Vercel · Production' && i.category === 'vercel')).toBe(true)
  })

  test('sync button POSTs /sync and flips status to connected', async ({ page }) => {
    await signup(page)
    const created = await apiFetch(page, 'POST', '/integrations', {
      name: 'AWS · Secrets',
      category: 'aws',
      config: {},
    })
    expect(created.status).toBe(201)
    const id = (created.json as { id: string }).id
    await page.goto(APP_BASE + '/integrations')
    await page.waitForTimeout(1000)
    await page.locator(`[data-mol-id="integration-sync-${id}"]`).click()
    await page.waitForTimeout(1500)
    const after = await apiFetch(page, 'GET', `/integrations/${id}`)
    expect((after.json as { status: string }).status).toBe('connected')
  })
})
