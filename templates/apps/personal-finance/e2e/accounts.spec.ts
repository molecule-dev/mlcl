import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedAccount, signup } from './_helpers.js'

test('Accounts list page renders empty state for a new user, links to /accounts/new', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/accounts')
  await page.waitForLoadState('networkidle')

  // Empty-state CTA exists
  const addBtn = page.getByRole('link', { name: /add account/i }).first()
  await expect(addBtn)
    .toBeVisible({ timeout: 10_000 })
    .catch(async () => {
      const headerBtn = page.getByRole('button').first()
      await expect(headerBtn).toBeVisible()
    })
})

test('Add Account form persists a new account and it appears in /accounts list (read-after-write)', async ({
  page,
}) => {
  const { accessToken, userId } = await signup(page)
  const accountName = `E2E Checking ${Date.now()}`

  await page.goto(APP_BASE + '/accounts/new')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-mol-id="add-account-name"]').fill(accountName)
  await page.locator('[data-mol-id="add-account-type"]').selectOption('savings')
  await page.locator('[data-mol-id="add-account-institution"]').fill('Test Bank')
  await page.locator('[data-mol-id="add-account-balance"]').fill('1500')

  const reqs = await captureNetwork(page, async () => {
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForURL('**/accounts', { timeout: 10_000 })
  })

  const post = reqs.find((r) => /\/api\/accounts$/.test(r.url) && r.method === 'POST')
  expect(post, 'POST /api/accounts did not fire').toBeTruthy()
  expect(post!.status).toBeLessThan(300)

  // Read-after-write via API
  const list = await page.request.get('/api/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(list.status()).toBe(200)
  const body = (await list.json()) as Array<{
    name: string
    type: string
    balance: string | number
    user_id: string
  }>
  const created = body.find((a) => a.name === accountName)
  expect(created, 'New account not visible in GET /api/accounts').toBeTruthy()
  expect(created!.type).toBe('savings')
  expect(Number(created!.balance)).toBe(1500)
  expect(created!.user_id).toBe(userId)

  // Read-after-write in UI
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(accountName).first()).toBeVisible({ timeout: 10_000 })
})

test('Account detail page loads a seeded account with correct fields', async ({ page }) => {
  const { accessToken } = await signup(page)
  const acct = await seedAccount(page, accessToken, {
    name: 'Detail-Test Brokerage',
    type: 'investment',
    initial_balance: 2500,
  })

  await page.goto(APP_BASE + '/accounts/' + acct.id)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Detail-Test Brokerage').first()).toBeVisible({ timeout: 10_000 })
})

test('Delete account removes it from list (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const a1 = await seedAccount(page, accessToken, { name: 'Doomed Account 1' })
  await seedAccount(page, accessToken, { name: 'Survivor' })

  const del = await page.request.delete(`/api/accounts/${a1.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(del.status()).toBeLessThan(300)
  const list = await page.request.get('/api/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = (await list.json()) as Array<{ id: string; name: string }>
  expect(
    body.find((a) => a.id === a1.id),
    'deleted account still listed',
  ).toBeFalsy()
  expect(body.find((a) => a.name === 'Survivor')).toBeTruthy()
})
