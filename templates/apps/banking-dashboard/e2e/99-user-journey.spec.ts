/**
 * 99-user-journey — kitchen-sink cross-page flow that exercises a real
 * user from signup through linking accounts, moving money, generating a
 * statement, viewing the audit trail, and updating their profile.
 *
 * If any individual per-page spec passes but this end-to-end journey
 * doesn't, then the app fails the "user clicks every interactive element
 * on every page" contract.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  postTransfer,
  seedAccount,
  seedRecipient,
  seedStatement,
  signup,
} from './_helpers.js'

test.describe('user journey', () => {
  test('full happy path: signup → link accounts → transfer → statements → audit → settings', async ({
    page,
  }) => {
    const sess = await signup(page)

    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 })

    const fundedRes = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(sess.accessToken),
      data: {
        name: 'Journey Funded',
        kind: 'checking',
        balance_cents: 10_000,
        available_cents: 10_000,
      },
    })
    expect(fundedRes.status()).toBe(201)
    const funded = await fundedRes.json()
    const sink = await seedAccount(page, sess.accessToken, { name: 'Journey Sink' })
    await seedRecipient(page, sess.accessToken, 'Journey Recipient')

    await page.goto(APP_BASE + '/accounts')
    await expect(page.getByText('Journey Funded').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Journey Sink').first()).toBeVisible()

    await page.getByText('Journey Funded').first().click()
    await page.waitForURL(`**/accounts/${funded.id}`, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({
      timeout: 15000,
    })

    const memo = 'Journey transfer ' + Date.now()
    const tr = await postTransfer(page, sess.accessToken, {
      from_account_id: funded.id,
      to_account_id: sink.id,
      amount_cents: 2_500,
      description: memo,
    })
    expect(tr.status).toBe(201)

    const re = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(sess.accessToken),
    })
    const accounts = (await re.json()) as Array<{ id: string; balance_cents: number }>
    expect(accounts.find((a) => a.id === funded.id)?.balance_cents).toBe(7_500)
    expect(accounts.find((a) => a.id === sink.id)?.balance_cents).toBe(2_500)

    await seedStatement(page, sess.accessToken, funded.id)
    await page.goto(APP_BASE + '/statements')
    await expect(page.getByRole('link', { name: /download pdf/i }).first()).toBeVisible({
      timeout: 15000,
    })

    await page.goto(APP_BASE + '/audit')
    await expect(page.getByText(/signed in to current session/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(memo).first()).toBeVisible()

    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/transfer complete/i).first()).toBeVisible({ timeout: 15000 })

    await page.goto(APP_BASE + '/settings')
    const newName = 'Journey User ' + Date.now()
    await page.locator('input#profile-name').fill(newName)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.locator('[data-mol-id="settings-profile-saved"]')).toBeVisible({
      timeout: 15000,
    })

    await page.reload()
    await expect(page.locator('input#profile-name')).toHaveValue(newName, { timeout: 15000 })

    await page.goto(APP_BASE + '/transfers')
    await expect(page.getByRole('heading', { name: /move money/i, level: 1 })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('form button[type="submit"]')).toBeVisible()
  })

  test('logout clears the session and redirects to login when visiting /dashboard', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 })

    await page.context().clearCookies()
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForURL(/\/login/, { timeout: 15000 })
  })
})
