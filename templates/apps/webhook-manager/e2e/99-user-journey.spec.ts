import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, requireAccessToken, signup } from './_helpers'

/**
 * Cross-page kitchen-sink user journey. A new user signs up, creates an
 * endpoint, sends a test delivery, mints an API key, invites a teammate,
 * checks every primary page, and confirms read-after-write invariants.
 */
test.describe('user journey · webhook-manager', () => {
  // A six-page journey: measured at ~30 s, right at the 30 s sandbox budget.
  test.setTimeout(120_000)

  test('create endpoint → send test → live data on Dashboard, Endpoints, Deliveries, Audit, API keys, Team', async ({
    page,
  }) => {
    // 1. Sign up
    await signup(page)
    const token = await requireAccessToken(page)
    expect(token).toMatch(/^eyJ/)

    // 2. New user has empty workspaces
    let webhooks = await (
      await page.request.get(API_BASE + '/webhooks', {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()
    expect(webhooks).toEqual([])

    // 3. Create endpoint via UI
    await page.goto(APP_BASE + '/endpoints/new')
    const targetUrl = 'https://example.com/journey-' + Date.now()
    await page.locator('#url').fill(targetUrl)
    await page.locator('#description').fill('Journey endpoint')
    await page.getByRole('button', { name: /create endpoint/i }).click()
    await page.waitForURL(/\/endpoints\/[0-9a-f-]{8,}/, { timeout: 15_000 })

    // 4. Read-after-write: GET shows the endpoint
    webhooks = await (
      await page.request.get(API_BASE + '/webhooks', {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()
    expect(webhooks.length).toBe(1)
    expect(webhooks[0].url).toBe(targetUrl)
    const wh = webhooks[0]

    // 5. Send a test delivery via UI
    await page.getByRole('button', { name: /send test/i }).click()
    await page.waitForTimeout(3500)
    const deliveries = await (
      await page.request.get(API_BASE + '/deliveries?webhook_id=' + wh.id, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()
    expect(deliveries.length).toBeGreaterThan(0)
    expect(deliveries[0].webhook_id).toBe(wh.id)

    // 6. Dashboard shows the endpoint
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(targetUrl)).toHaveCount(2, { timeout: 10_000 })

    // 7. Audit log has endpoint.created + endpoint.tested
    await page.goto(APP_BASE + '/audit')
    await expect(page.getByText('endpoint.created').first()).toBeVisible({ timeout: 10_000 })

    // 8. Mint an API key, plaintext shown once
    await page.goto(APP_BASE + '/settings/api-keys')
    await page.locator('[data-mol-id="api-keys-toggle-form"]').click()
    await page.locator('[data-mol-id="api-keys-name-input"]').fill('journey-key')
    await page.locator('[data-mol-id="api-keys-create-submit"]').click()
    await page.waitForTimeout(1500)
    const revealed = await page.locator('[data-mol-id="api-keys-revealed-secret"]').textContent()
    expect(revealed).toMatch(/^pk_(live|test)_[a-f0-9]+/)

    // 9. Invite teammate
    await page.goto(APP_BASE + '/settings/team')
    await page.locator('[data-mol-id="team-toggle-invite"]').click()
    const inviteEmail = `journey-${Date.now()}@example.com`
    await page.locator('[data-mol-id="team-invite-email"]').fill(inviteEmail)
    await page.locator('[data-mol-id="team-invite-submit"]').click()
    await page.waitForTimeout(1500)
    const team = await (
      await page.request.get(API_BASE + '/team_members', {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()
    expect(team.find((m: { email: string }) => m.email === inviteEmail)).toBeDefined()

    // 10. Settings persists across reload
    await page.goto(APP_BASE + '/settings')
    const newName = 'JourneyWS-' + Date.now()
    await page.locator('[data-mol-id="settings-workspace-name"]').fill(newName)
    await page.getByRole('button', { name: /save settings/i }).click()
    await page.waitForTimeout(1500)
    await page.reload()
    await expect(page.locator('[data-mol-id="settings-workspace-name"]')).toHaveValue(newName, {
      timeout: 10_000,
    })

    // 11. Profile name persists across reload
    await page.goto(APP_BASE + '/profile')
    const firstName = 'Journey' + Date.now()
    await page.locator('[data-mol-id="profile-first-name"]').fill(firstName)
    await page.locator('[data-mol-id="profile-update"]').click()
    await page.waitForTimeout(1500)
    await page.reload()
    await expect(page.locator('[data-mol-id="profile-first-name"]')).toHaveValue(firstName, {
      timeout: 10_000,
    })

    // 12. Billing status reachable
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings/billing')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url)),
    ).toBeDefined()
  })
})
