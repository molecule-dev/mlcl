/**
 * Connection CRUD: empty state, create/test/delete, edit + persistence.
 *
 * Every assertion is read-after-write — the next list fetch reflects
 * the create/delete; the test endpoint actually pings the remote DB and
 * the `connection-test-ok` badge appears only when the round-trip
 * succeeded.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  DEMO_DB,
  DEMO_HOST,
  DEMO_PASSWORD,
  DEMO_PORT,
  DEMO_USER,
  signup,
} from './_helpers.js'

test.describe('Connections', () => {
  test('empty state is rendered for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto('/connections')
    await expect(page.locator('[data-mol-id="connections-empty"]')).toBeVisible()
  })

  test('Test connection (in /connections/new) probes the real Postgres and badges OK', async ({
    page,
  }) => {
    await signup(page)
    await page.goto('/connections/new')

    await page.locator('#conn-name').fill('Demo')
    await page.locator('#conn-host').fill(DEMO_HOST)
    await page.locator('#conn-port').fill(String(DEMO_PORT))
    await page.locator('#conn-database').fill(DEMO_DB)
    await page.locator('#conn-username').fill(DEMO_USER)
    await page.locator('#conn-password').fill(DEMO_PASSWORD)

    await page.locator('[data-mol-id="new-conn-test-button"]').click()
    await expect(page.locator('[data-mol-id="new-conn-test-ok"]')).toBeVisible({ timeout: 10_000 })
  })

  test('Save creates the connection and lists it on /connections', async ({ page }) => {
    await signup(page)
    await page.goto('/connections/new')

    await page.locator('#conn-name').fill('Demo Save')
    await page.locator('#conn-host').fill(DEMO_HOST)
    await page.locator('#conn-port').fill(String(DEMO_PORT))
    await page.locator('#conn-database').fill(DEMO_DB)
    await page.locator('#conn-username').fill(DEMO_USER)
    await page.locator('#conn-password').fill(DEMO_PASSWORD)

    await Promise.all([
      page.waitForURL(/\/query\//, { timeout: 10_000 }),
      page.locator('[data-mol-id="new-conn-save"]').click(),
    ])

    await page.goto('/connections')
    const card = page.locator('[data-conn-name="Demo Save"]')
    await expect(card).toBeVisible()
  })

  test('Test action on a saved connection shows OK badge', async ({ page }) => {
    await signup(page)
    await page.goto('/connections/new')
    await page.locator('#conn-name').fill('Demo Test Action')
    await page.locator('#conn-host').fill(DEMO_HOST)
    await page.locator('#conn-port').fill(String(DEMO_PORT))
    await page.locator('#conn-database').fill(DEMO_DB)
    await page.locator('#conn-username').fill(DEMO_USER)
    await page.locator('#conn-password').fill(DEMO_PASSWORD)
    await page.locator('[data-mol-id="new-conn-save"]').click()
    await expect(page).toHaveURL(/\/query\//)

    await page.goto('/connections')
    const card = page.locator('[data-conn-name="Demo Test Action"]')
    await card.locator('[data-mol-id^="connection-test-"]').click()
    await expect(card.locator('[data-mol-id="probe-ok"]')).toBeVisible({ timeout: 10_000 })
  })

  test('Edit page persists field changes (read-after-write)', async ({ page }) => {
    await signup(page)
    await page.goto('/connections/new')
    await page.locator('#conn-name').fill('Demo Edit Original')
    await page.locator('#conn-host').fill(DEMO_HOST)
    await page.locator('#conn-port').fill(String(DEMO_PORT))
    await page.locator('#conn-database').fill(DEMO_DB)
    await page.locator('#conn-username').fill(DEMO_USER)
    await page.locator('#conn-password').fill(DEMO_PASSWORD)
    await page.locator('[data-mol-id="new-conn-save"]').click()
    await expect(page).toHaveURL(/\/query\//)

    await page.goto('/connections')
    const card = page.locator('[data-conn-name="Demo Edit Original"]')
    await card.locator('[data-mol-id^="connection-edit-"]').click()
    await page.waitForURL(/\/connections\/.+\/edit/)

    await page.locator('#conn-name').fill('Demo Edit Renamed')
    await page.locator('[data-mol-id="ec-save"]').click()
    await expect(page.locator('[data-mol-id="ec-saved"]')).toBeVisible({ timeout: 5_000 })

    // Reload + re-check from /connections list
    await page.goto('/connections')
    await expect(page.locator('[data-conn-name="Demo Edit Renamed"]')).toBeVisible()
    await expect(page.locator('[data-conn-name="Demo Edit Original"]')).toHaveCount(0)
  })

  test('Delete removes the connection both from UI and from the API', async ({ page, request }) => {
    const { email, password } = await signup(page)
    await page.goto('/connections/new')
    await page.locator('#conn-name').fill('Demo Delete Me')
    await page.locator('#conn-host').fill(DEMO_HOST)
    await page.locator('#conn-port').fill(String(DEMO_PORT))
    await page.locator('#conn-database').fill(DEMO_DB)
    await page.locator('#conn-username').fill(DEMO_USER)
    await page.locator('#conn-password').fill(DEMO_PASSWORD)
    await page.locator('[data-mol-id="new-conn-save"]').click()
    await expect(page).toHaveURL(/\/query\//)

    await page.goto('/connections')
    const card = page.locator('[data-conn-name="Demo Delete Me"]')
    await expect(card).toBeVisible()

    page.once('dialog', (d) => d.accept())
    await card.locator('[data-mol-id^="connection-delete-"]').click()
    await expect(page.locator('[data-conn-name="Demo Delete Me"]')).toHaveCount(0, {
      timeout: 5_000,
    })

    // Confirm via API list as well — read-after-write.
    const auth = await request.post(API_BASE + '/users/log-in', {
      headers: { 'content-type': 'application/json' },
      data: { email, password },
    })
    const { accessToken } = (await auth.json()) as { accessToken: string }
    const list = await request.get(API_BASE + '/connections', {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    const arr = (await list.json()) as Array<{ name: string }>
    expect(arr.find((c) => c.name === 'Demo Delete Me')).toBeUndefined()
  })
})
