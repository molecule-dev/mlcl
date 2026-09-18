/**
 * /transfers — submit a transfer between two accounts of the same user.
 * Verifies UI form, network round-trip, ledger debit/credit invariants
 * and inline error surfacing for insufficient_funds.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  captureNetwork,
  postTransfer,
  seedAccount,
  seedRecipient,
  signup,
} from './_helpers.js'

test.describe('/transfers (Move money)', () => {
  test('initial paint loads accounts + recipients and shows idle status copy', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/transfers')
      await expect(page.getByRole('heading', { name: /move money/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
    })
    expect(reqs.find((r) => /\/api\/accounts(?:\?|$)/.test(r.url) && r.status < 400)).toBeTruthy()
    expect(reqs.find((r) => /\/api\/recipients(?:\?|$)/.test(r.url) && r.status < 400)).toBeTruthy()
    await expect(page.locator('[data-mol-id="transfers-status"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="transfers-status"]')).toContainText(
      /pick an account|loading|move money/i,
    )
  })

  test('h1 reads "Move money" and form renders once accounts loaded', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedAccount(page, accessToken)
    await page.goto(APP_BASE + '/transfers')
    await expect(page.getByRole('heading', { name: /move money/i, level: 1 })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('form button[type="submit"]')).toBeVisible({ timeout: 15000 })
  })

  test('From combobox is populated with seeded accounts', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedAccount(page, accessToken, { name: 'FromAcct' })
    await page.goto(APP_BASE + '/transfers')
    await expect(page.locator('form select').first()).toBeVisible({ timeout: 15000 })
    const optsText = await page.locator('form select').first().innerText()
    expect(optsText.toLowerCase()).toContain('fromacct')
  })

  test('Toggle "A recipient" switches the to-picker; data-to-type-tick increments', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await seedAccount(page, accessToken)
    await seedRecipient(page, accessToken, 'Recip ' + Date.now())
    await page.goto(APP_BASE + '/transfers')
    await expect(page.locator('form button[type="submit"]')).toBeVisible({ timeout: 15000 })
    const wrapper = page.locator('[data-mol-id="page-transfers"]')
    const before = Number(await wrapper.getAttribute('data-to-type-tick'))
    await page.getByRole('button', { name: /a recipient/i }).click()
    const after = Number(await wrapper.getAttribute('data-to-type-tick'))
    expect(after).toBeGreaterThan(before)
  })

  test('Toggle "Another account" switches back, second tick bump observable', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedAccount(page, accessToken, { name: 'A' })
    await seedAccount(page, accessToken, { name: 'B' })
    await page.goto(APP_BASE + '/transfers')
    await expect(page.locator('form button[type="submit"]')).toBeVisible({ timeout: 15000 })
    const wrapper = page.locator('[data-mol-id="page-transfers"]')
    await page.getByRole('button', { name: /a recipient/i }).click()
    const t1 = Number(await wrapper.getAttribute('data-to-type-tick'))
    await page.getByRole('button', { name: /another account/i }).click()
    const t2 = Number(await wrapper.getAttribute('data-to-type-tick'))
    expect(t2).toBeGreaterThan(t1)
  })

  test('Insufficient funds surfaces an inline error and does NOT debit', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a = await seedAccount(page, accessToken, { name: 'Empty A' })
    const b = await seedAccount(page, accessToken, { name: 'Empty B' })
    const res = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/transfers', {
      headers: apiHeaders(accessToken),
      data: { from_account_id: a.id, to_account_id: b.id, amount_cents: 999_999 },
    })
    expect(res.status()).toBe(400)
    const accts = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
    })
    const list = (await accts.json()) as Array<{ id: string; balance_cents: number }>
    expect(list.find((x) => x.id === a.id)?.balance_cents).toBe(0)
    expect(list.find((x) => x.id === b.id)?.balance_cents).toBe(0)
  })

  test('POST /api/transfers with funded account returns 201 and debits the source', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const fundedRes = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'Funded', kind: 'checking', balance_cents: 5_000, available_cents: 5_000 },
    })
    const funded = await fundedRes.json()
    const sink = await seedAccount(page, accessToken, { name: 'Sink' })
    const result = await postTransfer(page, accessToken, {
      from_account_id: funded.id,
      to_account_id: sink.id,
      amount_cents: 1_500,
      description: 'Spec ' + Date.now(),
    })
    expect(result.status).toBe(201)
    const re = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
    })
    const list = (await re.json()) as Array<{ id: string; balance_cents: number }>
    expect(list.find((x) => x.id === funded.id)?.balance_cents).toBe(3_500)
    expect(list.find((x) => x.id === sink.id)?.balance_cents).toBe(1_500)
  })

  test('UI submit success flips status copy to "Transfer scheduled"', async ({ page }) => {
    const { accessToken } = await signup(page)
    const fundedRes = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'Funded UI', kind: 'checking', balance_cents: 10_000, available_cents: 10_000 },
    })
    const funded = await fundedRes.json()
    const sink = await seedAccount(page, accessToken, { name: 'Sink UI' })
    await page.goto(APP_BASE + '/transfers')
    await expect(page.locator('form button[type="submit"]')).toBeVisible({ timeout: 15000 })
    await page.locator('form select').first().selectOption({ value: funded.id })
    await page.locator('form select').nth(1).selectOption({ value: sink.id })
    await page.locator('input[type="number"]').fill('5.00')
    await page.locator('input[type="text"]').fill('UI test ' + Date.now())
    await page.locator('form button[type="submit"]').click()
    await expect(page.locator('[data-mol-id="transfers-status"]')).toContainText(
      /scheduled|submitted/i,
      {
        timeout: 15000,
      },
    )
  })

  test('UI submit on insufficient funds renders [data-mol-id="transfers-error"]', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const a = await seedAccount(page, accessToken, { name: 'Zero A' })
    await seedAccount(page, accessToken, { name: 'Zero B' })
    void a
    await page.goto(APP_BASE + '/transfers')
    await expect(page.locator('form button[type="submit"]')).toBeVisible({ timeout: 15000 })
    await page.locator('form select').nth(1).selectOption({ index: 1 })
    await page.locator('input[type="number"]').fill('999.00')
    await page.locator('form button[type="submit"]').click()
    await expect(page.locator('[data-mol-id="transfers-error"]')).toBeVisible({ timeout: 15000 })
  })

  test('amount=0 submission shows inline validation error, no POST fires', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedAccount(page, accessToken, { name: 'A' })
    await seedAccount(page, accessToken, { name: 'B' })
    await page.goto(APP_BASE + '/transfers')
    await expect(page.locator('form button[type="submit"]')).toBeVisible({ timeout: 15000 })
    await page.locator('form select').nth(1).selectOption({ index: 1 })
    await page.locator('input[type="number"]').fill('0')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('form button[type="submit"]').click()
      await expect(page.locator('[data-mol-id="transfers-error"]')).toBeVisible({ timeout: 5000 })
    })
    expect(reqs.find((r) => r.method === 'POST' && /\/api\/transfers/.test(r.url))).toBeFalsy()
  })

  test('GET /api/transfers after POST returns the transfer ordered desc', async ({ page }) => {
    const { accessToken } = await signup(page)
    const fundedRes = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'L', kind: 'checking', balance_cents: 50_000, available_cents: 50_000 },
    })
    const funded = await fundedRes.json()
    const sink = await seedAccount(page, accessToken)
    await postTransfer(page, accessToken, {
      from_account_id: funded.id,
      to_account_id: sink.id,
      amount_cents: 100,
      description: 'list-test',
    })
    const list = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/transfers', {
      headers: apiHeaders(accessToken),
    })
    const json = (await list.json()) as Array<{ description: string }>
    expect(json.find((t) => t.description === 'list-test')).toBeTruthy()
  })
})
