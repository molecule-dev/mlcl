/**
 * /privacy — public legal page. Renders heading + paragraph; the intro
 * must interpolate APP_NAME (no `{{app}}` placeholder leaking through).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('privacy page', () => {
  test('renders the Privacy heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible()
  })

  test('intro paragraph references the app and has no raw {{app}} placeholder', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/privacy')
    // innerText() is a one-shot read with no auto-waiting, and goto() resolves on
    // `load` — before React paints. It therefore sampled an EMPTY body and failed
    // (measured: received ""). The positive assertion auto-retries, so hoisting it
    // doubles as the wait; the negative check then runs against a settled DOM.
    const body = page.locator('body')
    await expect(body).toContainText(/privacy/i)
    expect(await body.innerText()).not.toContain('{{app}}')
  })

  test('page-privacy data-mol-id container is present', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const root = page.locator('[data-mol-id="page-privacy"]').first()
    await expect(root).toBeAttached()
  })
})
