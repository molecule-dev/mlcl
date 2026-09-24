/**
 * Shared-control migration specs.
 *
 * The Settings preference toggles now render the shared
 * @molecule/app-ui-react <Switch> (role=switch + aria-checked through a
 * hidden native checkbox) and the Compose toolbar's link/image URL prompts
 * render the shared <PromptDialog> — the hand-rolled role="switch" button
 * and the native window.prompt calls are gone (window.prompt hangs headless
 * and is unreachable in e2e). These specs assert the NEW interactions:
 * aria-checked flips + persistence for the switches, and the dialog's
 * confirm/cancel paths for the prompts.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('forum shared controls (Switch + PromptDialog)', () => {
  test('settings switches flip aria-checked and persist across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    // The preference switches live in the Notifications section.
    await page.getByRole('button', { name: 'Notifications' }).click()
    const digest = page.locator('[data-mol-id="pref-email-digest"]')
    await expect(digest).toHaveAttribute('role', 'switch')
    const before = (await digest.getAttribute('aria-checked')) ?? 'false'
    await digest.click()
    const after = before === 'true' ? 'false' : 'true'
    await expect(digest).toHaveAttribute('aria-checked', after)
    // Wait out the PATCH before reloading — a reload mid-write aborts the
    // request. The inline status span flips Saving… → Saved. on success.
    await expect(page.locator('span[role="status"]')).toHaveText(/Saved\./, { timeout: 15000 })
    // The flip is persisted through PATCH /api/preferences (server-side
    // per-user jsonb bag) — a reload reads the value back from the server.
    await page.reload()
    await page.getByRole('button', { name: 'Notifications' }).click()
    await expect(page.locator('[data-mol-id="pref-email-digest"]')).toHaveAttribute(
      'aria-checked',
      after,
    )
  })

  test('compose link toolbar opens the PromptDialog and inserts markdown', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/compose')
    const body = page.locator('textarea').first()
    // Cancel path: dialog opens, cancel closes it, body stays untouched.
    await page.getByRole('button', { name: 'Link', exact: true }).click()
    const input = page.locator('[data-mol-id="compose-link-url-input"]')
    await expect(input).toBeVisible()
    await expect(input).toHaveValue('https://')
    await page.locator('[data-mol-id="compose-url-cancel"]').click()
    await expect(input).toHaveCount(0)
    await expect(body).toHaveValue('')
    // Confirm path: the entered URL lands in the body as markdown.
    await page.getByRole('button', { name: 'Link', exact: true }).click()
    await input.fill('https://example.com/post')
    await page.locator('[data-mol-id="compose-link-url-confirm"]').click()
    await expect(body).toHaveValue('[link text](https://example.com/post)')
  })

  test('compose image toolbar prompt inserts image markdown', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/compose')
    await page.getByRole('button', { name: 'Image', exact: true }).click()
    await page
      .locator('[data-mol-id="compose-image-url-input"]')
      .fill('https://example.com/cat.png')
    await page.locator('[data-mol-id="compose-image-url-confirm"]').click()
    await expect(page.locator('textarea').first()).toHaveValue(
      '![alt text](https://example.com/cat.png)',
    )
  })
})
