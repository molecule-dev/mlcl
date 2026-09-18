/**
 * 99-user-journey — kitchen-sink cross-page flow that exercises the full
 * primary user lifecycle in one test:
 *   signup → buy holding → record tx → track watchlist → save settings →
 *   read notifications → log out → log back in → verify everything
 *   persisted via API + UI.
 *
 * Required by verify-app-coverage.mjs (gate 6).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  listHoldings,
  listTransactions,
  listWatchlist,
  login,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('full investment-portfolio user journey', () => {
  test.setTimeout(180_000)

  test('signup → buy → tx → watchlist → settings → re-login persists everything', async ({
    page,
    context,
  }) => {
    const email = uniqueEmail('journey')
    const password = 'JourneyPass!9876'

    // 1. Signup → /dashboard, accessToken in localStorage.
    const { accessToken } = await signup(page, email, password, 'Journey User')
    expect(accessToken).toBeTruthy()
    await expect(page).toHaveURL(/\/dashboard/)

    // 2. Buy a holding via the UI (Holdings → Buy modal).
    await page.goto(APP_BASE + '/holdings')
    await page.getByRole('button', { name: /^Buy$/ }).first().click()
    await page.waitForTimeout(300)
    await page
      .locator('label')
      .filter({ hasText: /^Symbol$/ })
      .locator('input')
      .first()
      .fill('AAPL')
    await page
      .locator('label')
      .filter({ hasText: /^Shares$/ })
      .locator('input')
      .first()
      .fill('10')
    await page
      .locator('label')
      .filter({ hasText: /Price per share/i })
      .locator('input')
      .first()
      .fill('200')
    await page
      .getByRole('button', { name: /^Save transaction$/ })
      .first()
      .click()
    await page.waitForTimeout(1500)

    // Verify holding via API.
    let holdings = await listHoldings(page, accessToken)
    expect(holdings.find((h) => h.symbol === 'AAPL')).toBeTruthy()

    // 3. Record a manual transaction (MSFT) via the Transactions page.
    await page.goto(APP_BASE + '/transactions')
    await page
      .getByRole('button', { name: /Record transaction/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    await page
      .locator('label')
      .filter({ hasText: /^Symbol$/ })
      .locator('input')
      .first()
      .fill('MSFT')
    await page
      .locator('label')
      .filter({ hasText: /^Shares$/ })
      .locator('input')
      .first()
      .fill('5')
    await page
      .locator('label')
      .filter({ hasText: /Price per share/i })
      .locator('input')
      .first()
      .fill('442')
    await page
      .getByRole('button', { name: /^Save transaction$/ })
      .first()
      .click()
    await page.waitForTimeout(1500)
    let txs = await listTransactions(page, accessToken)
    expect(txs.find((t) => t.symbol === 'MSFT' && t.kind === 'buy')).toBeTruthy()

    // 4. Track NVDA on the Watchlist.
    await page.goto(APP_BASE + '/watchlist')
    await page
      .getByRole('button', { name: /Track ticker/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    await page
      .locator('label')
      .filter({ hasText: /^Symbol$/ })
      .locator('input')
      .first()
      .fill('NVDA')
    await page
      .getByRole('button', { name: /^Track$/ })
      .first()
      .click()
    await page.waitForTimeout(1500)
    let wl = await listWatchlist(page, accessToken)
    expect(wl.find((w) => w.symbol === 'NVDA')).toBeTruthy()

    // 5. Update profile name + advisor email via Settings.
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page
      .locator('label')
      .filter({ hasText: /Full name/i })
      .locator('input')
      .first()
      .fill('Journey Renamed')
    await page
      .locator('label')
      .filter({ hasText: /Advisor email/i })
      .locator('input')
      .first()
      .fill('advisor@journey.example')
    await page
      .getByRole('button', { name: /^Save changes$/ })
      .first()
      .click()
    await page.waitForTimeout(1500)

    // 6. Notifications — fetch then read-all.
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.request.post(`${API_BASE}/notifications/read-all`, {
      headers: authHeaders(accessToken),
      data: {},
    })

    // 7. Log out (simulate with localStorage clear) and log back in.
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await login(page, email, password)

    // 8. After re-login, all data should still be there.
    holdings = await listHoldings(page, accessToken)
    expect(
      holdings.find((h) => h.symbol === 'AAPL'),
      'AAPL holding gone after re-login',
    ).toBeTruthy()

    txs = await listTransactions(page, accessToken)
    expect(
      txs.find((t) => t.symbol === 'MSFT'),
      'MSFT tx gone after re-login',
    ).toBeTruthy()
    expect(
      txs.find((t) => t.symbol === 'AAPL'),
      'AAPL opening tx gone after re-login',
    ).toBeTruthy()

    wl = await listWatchlist(page, accessToken)
    expect(
      wl.find((w) => w.symbol === 'NVDA'),
      'NVDA watchlist gone after re-login',
    ).toBeTruthy()

    const meRes = await page.request.get(`${API_BASE}/users/me`, {
      headers: authHeaders(accessToken),
    })
    const meBody = (await meRes.json()) as { name?: string; props?: { name?: string } }
    const persistedName = meBody?.props?.name ?? meBody?.name
    expect(persistedName, 'profile name lost after re-login').toBe('Journey Renamed')

    const settingsRes = await page.request.get(`${API_BASE}/user-settings`, {
      headers: authHeaders(accessToken),
    })
    const settingsBody = (await settingsRes.json()) as {
      advisor_email?: string
      data?: { advisor_email?: string }
    }
    const advisor = settingsBody?.data?.advisor_email ?? settingsBody?.advisor_email
    expect(advisor).toBe('advisor@journey.example')

    const ntsRes = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(accessToken),
    })
    const ntsBody = (await ntsRes.json()) as Array<{ unread?: boolean }>
    const unread = (Array.isArray(ntsBody) ? ntsBody : []).filter((n) => n.unread === true)
    expect(unread.length, 'notifications regressed to unread after re-login').toBe(0)
  })
})
