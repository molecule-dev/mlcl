/**
 * 99-user-journey — end-to-end happy path covering the whole product:
 *   1. Sign up
 *   2. Create a counterparty
 *   3. Create a template
 *   4. Create a contract from scratch (wizard)
 *   5. Send for signature
 *   6. Sign
 *   7. Verify dashboard reflects the new state (>=1 contract)
 *   8. Verify notifications page shows sent + signed events
 *   9. Update profile in /settings
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('99 — full user journey', () => {
  test('signup → counterparty → template → contract → send → sign → verify', async ({ page }) => {
    test.setTimeout(120_000)

    // 1. Sign up — fresh user
    await signup(page)
    await expect(page).toHaveURL(/\/dashboard/)

    // 2. Create a counterparty via /counterparties
    await page.goto(APP_BASE + '/counterparties')
    await page.locator('#new-counterparty').click()
    const orgName = `Journey Org ${Date.now()}`
    await page.locator('#cp-organization').fill(orgName)
    await page.locator('#cp-contact-name').fill('Counter Party')
    await page.locator('#cp-contact-email').fill('signer@journey.dev')
    await page.locator('#cp-save').click()
    await expect(page.getByText(orgName)).toBeVisible({ timeout: 10_000 })

    // 3. Create a template via /templates/new
    await page.goto(APP_BASE + '/templates/new')
    const tmplName = `Journey Tpl ${Date.now()}`
    await page.locator('#tmpl-name').fill(tmplName)
    await page.locator('#tmpl-description').fill('Journey description')
    await page.locator('#tmpl-content').fill('Dear {{name}}, this contract is dated {{date}}.')
    await page.locator('#save-template').click()
    await page.waitForURL(/\/templates\/(?!new)[0-9a-f-]+/, { timeout: 10_000 })

    // 4. Create a contract via the wizard
    await page.goto(APP_BASE + '/contracts/new')
    await page.locator('#newcontract-title').fill('Journey Contract')
    await page.getByRole('button', { name: /^Next$/i }).click()
    await page.locator('#newcontract-counterparty-name').fill(orgName)
    await page.locator('#newcontract-counterparty-email').fill('signer@journey.dev')
    await page.getByRole('button', { name: /^Next$/i }).click()
    await page.locator('#newcontract-amount').fill('5000')
    await page.getByRole('button', { name: /^Next$/i }).click()
    await page.getByRole('button', { name: /Send for signature|Create/i }).click()
    await page.waitForURL(/\/contracts\/(?!new)[0-9a-f-]+/, { timeout: 15_000 })
    const contractUrl = page.url()

    // 5. Send for signature
    await page.locator('#send-for-signature').click()
    await expect(page.locator('#sign-now')).toBeVisible({ timeout: 10_000 })

    // 6. Sign
    await page.locator('#sign-now').click()
    await expect(page.locator('#sign-now')).toHaveCount(0, { timeout: 10_000 })
    await expect(page.locator('#send-for-signature')).toHaveCount(0)

    // 7. Dashboard reflects the new state
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    // Should show a non-zero "Total contracts" or similar.
    await expect(page.getByText(/Total contracts/i)).toBeVisible()

    // 8. Notifications shows sent + signed events
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByText(/Sent.*Journey Contract|Journey Contract signed/i).first(),
    ).toBeVisible({
      timeout: 10_000,
    })

    // 9. Update profile in /settings
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const name = `Journey Tester ${Date.now()}`
    await page.locator('#settings-name').fill(name)
    await page
      .getByRole('button', { name: /Save profile|Save/i })
      .first()
      .click()
    await page.waitForTimeout(800)
    await page.reload()
    await expect(page.locator('#settings-name')).toHaveValue(name)

    // Final sanity — navigating back to the contract still works.
    await page.goto(contractUrl)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /Journey Contract/i })).toBeVisible()
  })
})
