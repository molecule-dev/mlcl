/**
 * /members — Engram team membership.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('members', () => {
  test('invite-button toggles the invite form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/members')
    await page.locator('[data-testid="members-invite-button"]').click()
    await expect(page.locator('[data-testid="members-invite-form"]')).toBeVisible()
  })

  test('email input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/members')
    await page.locator('[data-testid="members-invite-button"]').click()
    await page.locator('[data-testid="members-invite-email"]').fill('mate@flagship.test')
    await expect(page.locator('[data-testid="members-invite-email"]')).toHaveValue(
      'mate@flagship.test',
    )
  })

  test('role combobox can be changed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/members')
    await page.locator('[data-testid="members-invite-button"]').click()
    await page.locator('[data-testid="members-invite-role"]').selectOption('admin')
    await expect(page.locator('[data-testid="members-invite-role"]')).toHaveValue('admin')
  })

  test('submit POSTs /api/members and the new row appears', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/members')
    await page.locator('[data-testid="members-invite-button"]').click()
    const email = `mate-${Date.now()}@flagship.test`
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="members-invite-email"]').fill(email)
      await page.locator('[data-testid="members-invite-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => /\/api\/members\/?$/.test(r.url) && r.method === 'POST')
    expect(post?.status).toBe(201)

    // Read-after-write: GET /api/members must include the invitee.
    const res = await page.request.get(`${API_BASE}/members`, { headers: apiHeaders(accessToken) })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as Array<{ invitee_email?: string }>
    const list = Array.isArray(body) ? body : []
    expect(list.some((m) => m.invitee_email === email)).toBe(true)
  })

  test('empty members shows the empty placeholder', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/members')
    await expect(page.locator('[data-testid="members-empty"]')).toBeVisible()
  })

  test('after an invite, members-list contains the row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/members')
    await page.locator('[data-testid="members-invite-button"]').click()
    const email = `member-${Date.now()}@flagship.test`
    await page.locator('[data-testid="members-invite-email"]').fill(email)
    await page.locator('[data-testid="members-invite-submit"]').click()
    await expect(page.locator('[data-testid="members-list"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(email)).toBeVisible()
  })
})
