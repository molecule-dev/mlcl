/**
 * /contracts/:id — detail page renders body + signers, Send/Sign/Download
 * actions are wired and update state visibly.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, seedContract, seedCounterparty } from './_helpers.js'

test.describe('contract detail', () => {
  test('renders title + counterparty + signers section', async ({ page }) => {
    const { accessToken } = await signup(page)
    const cp = await seedCounterparty(page, accessToken)
    const c = await seedContract(page, accessToken, {
      title: 'Detail Render',
      counterparty_id: cp.id,
    })
    await page.goto(`${APP_BASE}/contracts/${c.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /Detail Render/i })).toBeVisible()
    await expect(page.getByText(cp.organization)).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Signers$/i })).toBeVisible()
  })

  test('Send for signature action transitions contract to pending', async ({ page }) => {
    const { accessToken } = await signup(page)
    const c = await seedContract(page, accessToken, { title: 'Send Test' })
    await page.goto(`${APP_BASE}/contracts/${c.id}`)
    await page.waitForLoadState('networkidle')

    const sendBtn = page.locator('#send-for-signature')
    await expect(sendBtn).toBeVisible()
    await sendBtn.click()

    // After successful POST /send, the Sign now button (#sign-now) should appear
    await expect(page.locator('#sign-now')).toBeVisible({ timeout: 10_000 })
  })

  test('Sign now action transitions contract to active', async ({ page }) => {
    const { accessToken } = await signup(page)
    const c = await seedContract(page, accessToken, { title: 'Sign Test' })
    await page.goto(`${APP_BASE}/contracts/${c.id}`)
    await page.waitForLoadState('networkidle')

    await page.locator('#send-for-signature').click()
    await expect(page.locator('#sign-now')).toBeVisible({ timeout: 10_000 })

    await page.locator('#sign-now').click()
    // After signing, neither Send nor Sign buttons should be visible.
    await expect(page.locator('#send-for-signature')).toHaveCount(0, { timeout: 10_000 })
    await expect(page.locator('#sign-now')).toHaveCount(0, { timeout: 10_000 })
  })

  test('Download PDF button is present and clickable (window.print stubbed)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const c = await seedContract(page, accessToken, { title: 'Download Test' })
    await page.addInitScript(() => {
      window.print = () => undefined
    })
    await page.goto(`${APP_BASE}/contracts/${c.id}`)
    await page.waitForLoadState('networkidle')
    const dl = page.locator('#download-pdf')
    await expect(dl).toBeVisible()
    await dl.click()
  })

  test('back link navigates to /contracts', async ({ page }) => {
    const { accessToken } = await signup(page)
    const c = await seedContract(page, accessToken, { title: 'Back Nav' })
    await page.goto(`${APP_BASE}/contracts/${c.id}`)
    await page.waitForLoadState('networkidle')
    await page
      .getByRole('link', { name: /All contracts/i })
      .first()
      .click()
    await page.waitForURL('**/contracts', { timeout: 5_000 })
  })
})
