import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, asList, captureNetwork, signup } from './_helpers.js'

test.describe('/team', () => {
  test('renders the current user as the owning team member', async ({ page }) => {
    const { email, name } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/team')
      await expect(page.getByRole('heading', { name: /^Team$/i })).toBeVisible()
    })
    const teamReq = reqs.find((r) => r.method === 'GET' && /\/api\/team-members(\?|$)/.test(r.url))
    expect(teamReq, 'mount must fetch /api/team-members').toBeTruthy()
    expect(teamReq?.status).toBe(200)
    await expect(page.getByText(email).first()).toBeVisible()
    await expect(page.getByText(name).first()).toBeVisible()
    await expect(page.getByText(/^owner$/i).first()).toBeVisible()
  })

  test('"+ Invite member" creates an invitation that persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    const inviteEmail = `invitee-${Date.now()}@parcel.test`
    await page.locator('[data-mol-id="button-invite-member"]').click()
    await page.locator('[data-mol-id="input-email"]').fill(inviteEmail)
    await page.locator('[data-mol-id="select-role"]').selectOption('admin')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="button-submit"]').click()
      await expect(page.locator('[data-mol-id="dialog-invite-member"]')).toBeHidden({
        timeout: 10_000,
      })
    })
    const inviteReq = reqs.find(
      (r) => r.method === 'POST' && /\/api\/team-members\/invite/.test(r.url),
    )
    expect(inviteReq, 'POST /api/team-members/invite should fire').toBeTruthy()
    expect(inviteReq?.status).toBeLessThan(400)

    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/team-members')
    expect(asList(body).find((m: any) => m.email === inviteEmail)).toBeTruthy()

    await page.reload()
    await expect(page.getByText(inviteEmail).first()).toBeVisible({ timeout: 10_000 })
  })

  test('cancel button leaves the team list unchanged', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    const before = asList((await apiRequest<unknown>(page, 'GET', '/api/team-members')).body)
    await page.locator('[data-mol-id="button-invite-member"]').click()
    await page.locator('[data-mol-id="input-email"]').fill('willcancel@example.com')
    await page.locator('[data-mol-id="button-cancel"]').click()
    await expect(page.locator('[data-mol-id="dialog-invite-member"]')).toBeHidden()
    const after = asList((await apiRequest<unknown>(page, 'GET', '/api/team-members')).body)
    expect(after.length).toBe(before.length)
  })

  test('reload preserves /team (token + roster)', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/team')
    await expect(page.getByText(email).first()).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(/\/team$/)
    await expect(page.getByText(email).first()).toBeVisible({ timeout: 10_000 })
  })
})
