/**
 * /terms — public legal page. Renders heading + paragraph; the intro
 * must interpolate APP_NAME (no `{{app}}` placeholder leaking through).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('terms page', () => {
  test('renders the Terms heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: 'Terms' })).toBeVisible()
  })

  test('intro paragraph has no raw {{app}} placeholder', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    // One-shot innerText() sampled a pre-paint (empty) body — see privacy.spec.ts.
    const body = page.locator('body')
    await expect(body).toContainText(/terms/i)
    expect(await body.innerText()).not.toContain('{{app}}')
  })

  test('page-terms data-mol-id container is present', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const root = page.locator('[data-mol-id="page-terms"]').first()
    await expect(root).toBeAttached()
  })
})
