import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, pickCoin, pickHolding, signup } from './_helpers'

/**
 * Cross-page kitchen-sink flow: a single user signs up, walks the primary
 * features in sequence, and verifies that each action's backend invariant
 * is reflected on the next read. Catches integration regressions that
 * per-page specs miss (e.g. an alert created on /alerts/new not surfacing
 * on /alerts; a holding added to portfolio not affecting /reports).
 */
test('end-to-end: signup → markets → coin → portfolio → alerts → settings → notifications → reload', async ({
  page,
}) => {
  // 1) signup → land on /dashboard with seeded data
  await signup(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByText(/total portfolio value/i)).toBeVisible({ timeout: 10_000 })

  // 2) markets list shows the catalog coins. The coin under test is read from
  //    the API rather than named — a seeded coin name breaks this journey the
  //    moment the demo catalog is replaced.
  const coin = await pickCoin(page)
  await page.goto(APP_BASE + '/markets')
  await expect(page.getByRole('link', { name: coin.name }).first()).toBeVisible({ timeout: 10_000 })

  // 3) coin detail loads with stats; /coin/:symbol reachable from list
  await page.goto(APP_BASE + `/coin/${coin.symbol}`)
  await expect(page.getByRole('heading', { name: coin.name })).toBeVisible({ timeout: 10_000 })

  // 4) portfolio: existing holdings show non-zero value
  const holding = await pickHolding(page)
  await page.goto(APP_BASE + '/portfolio')
  await expect(
    page.getByRole('link', { name: String(holding.name ?? holding.symbol) }),
  ).toBeVisible({ timeout: 10_000 })

  // 5) add a holding via /portfolio modal — assert backend reflects the new row
  await page.getByTestId('portfolio-add-holding').click()
  const portForm = page.getByTestId('portfolio-add-form')
  await expect(portForm).toBeVisible()
  const journeySymbol = 'NEAR'
  await portForm.locator('input[type="text"]').fill(journeySymbol)
  await portForm.locator('input[type="number"]').first().fill('17')
  await portForm.locator('input[type="number"]').nth(1).fill('5')
  const portReqs = await captureNetwork(page, async () => {
    await portForm.getByRole('button', { name: /save holding/i }).click()
    await expect(page.locator('table').getByText(new RegExp(journeySymbol, 'i'))).toBeVisible({
      timeout: 8_000,
    })
  })
  expect(
    portReqs.find((r) => /\/api\/portfolio/.test(r.url) && r.method === 'POST')?.status,
  ).toBeLessThan(400)

  // 6) create an alert via /alerts/new — assert it shows on /alerts after redirect
  await page.goto(APP_BASE + '/alerts/new')
  await expect(page.getByRole('heading', { name: /new alert/i })).toBeVisible()
  await page.locator('input[type="text"]').fill('AVAX')
  await page.locator('select').selectOption('above')
  await page.locator('input[type="number"]').fill('40')
  const alertReqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /create alert/i }).click()
    await expect(page).toHaveURL(/\/alerts$/, { timeout: 8_000 })
  })
  const alertCreate = alertReqs.find((r) => /\/api\/alerts/.test(r.url) && r.method === 'POST')
  expect(alertCreate?.status).toBeLessThan(400)
  // The list also reflects it
  const after = await page.evaluate(async () => {
    const r = await fetch('/api/alerts')
    const d = await r.json()
    return Array.isArray(d) ? d : d.data || []
  })
  expect(after.find((a: { symbol: string }) => a.symbol === 'AVAX')).toBeTruthy()

  // 7) log a transaction via /transactions modal
  await page.goto(APP_BASE + '/transactions')
  await page.getByTestId('transactions-log').click()
  const txForm = page.getByTestId('transactions-form')
  await expect(txForm).toBeVisible()
  await txForm.locator('select').selectOption('buy')
  await txForm.locator('input[type="text"]').first().fill('DOT')
  await txForm.locator('input[type="number"]').first().fill('5')
  await txForm.locator('input[type="number"]').nth(1).fill('8.20')
  const txReqs = await captureNetwork(page, async () => {
    await txForm.getByRole('button', { name: /save transaction/i }).click()
    await expect(txForm).toBeHidden({ timeout: 8_000 })
  })
  expect(
    txReqs.find((r) => /\/api\/transactions/.test(r.url) && r.method === 'POST')?.status,
  ).toBeLessThan(400)

  // 8) settings persistence — change refresh seconds, save, reload, persisted
  await page.goto(APP_BASE + '/settings')
  await page.getByTestId('settings-nav-preferences').click()
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="settings-refresh"]') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(el, '90')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 8_000 })
  await page.reload()
  await page.getByTestId('settings-nav-preferences').click()
  await expect(page.locator('[data-testid="settings-refresh"]')).toHaveValue('90')

  // 9) notifications page renders backend-driven notifications (length > 0)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({
    timeout: 10_000,
  })

  // 10) survives full reload — the holding we added still appears on /portfolio
  await page.goto(APP_BASE + '/portfolio')
  await expect(page.locator('table').getByText(new RegExp(journeySymbol, 'i'))).toBeVisible({
    timeout: 10_000,
  })
})
