import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('settings', () => {
  test('renders nav with team / locations / integrations / notifications / billing', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('settings-nav'))
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /settings/i, level: 1 })).toBeVisible()
    for (const tab of [
      /Team & roles/i,
      /Locations/i,
      /Integrations/i,
      /Alert rules/i,
      /Billing/i,
    ]) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible()
    }
  })

  test('Team tab lists the current signed-in user as the workspace Owner (no fake roster)', async ({
    page,
  }) => {
    const email = uniqueEmail('settings-team')
    await signup(page, email)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /team & roles/i }).click()
    const row = page.getByTestId('settings-team-row-self')
    await expect(row).toBeVisible()
    await expect(row).toContainText(email)
    await expect(row).toContainText(/Owner/i)
    // Edit profile link goes to /profile (not a no-op)
    const editLink = page.getByTestId('settings-team-edit-self')
    await expect(editLink).toHaveAttribute('href', '/profile')
  })

  test('Locations tab "Add warehouse" links to the real /warehouses page (not a no-op)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('settings-loc'))
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /locations/i }).click()
    const cta = page.getByTestId('settings-add-warehouse')
    await expect(cta).toHaveAttribute('href', '/warehouses')
    await cta.click()
    await expect(page).toHaveURL(/\/warehouses$/)
  })

  test('Integrations tab toggles persist across reload via PATCH /users/:id (oauthData.integrations)', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('settings-integrations')
    const { accessToken, userId } = await signup(page, email)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /integrations/i }).click()
    const toggle = page.getByTestId('settings-integration-toggle-shopify')
    await expect(toggle).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      await toggle.click()
      // After the click resolves the status flip should be visible on screen.
      await expect(page.getByTestId('settings-integration-status-shopify')).toContainText(
        /connected/i,
        { timeout: 8000 },
      )
    })
    const patch = reqs.find((r) => /\/users\/[^/]+/.test(r.url) && r.method === 'PATCH')
    expect(patch?.status, 'integration toggle did not PATCH /users/:id').toBe(200)

    const userResp = await request.get(`${API_BASE}/users/${userId}`, {
      headers: authHeaders(accessToken),
    })
    const userJson = (await userResp.json()) as {
      props?: { oauthData?: { integrations?: Record<string, { status?: string }> } }
    }
    expect(userJson.props?.oauthData?.integrations?.shopify?.status).toBe('connected')

    await page.reload()
    await page.getByRole('button', { name: /integrations/i }).click()
    await expect(page.getByTestId('settings-integration-status-shopify')).toContainText(
      /connected/i,
    )
  })

  test('Alert rules tab toggles persist via real /alerts/rules round-trip', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('settings-rules')
    const { accessToken } = await signup(page, email)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /alert rules/i }).click()
    const toggle = page.getByTestId('settings-rule-low')
    await expect(toggle).toBeVisible()
    // Default-on; flip off and verify a backing rule was created/updated.
    await toggle.uncheck()
    // Wait briefly for the network round-trip + state update.
    await page.waitForTimeout(500)
    const rulesResp = await request.get(`${API_BASE}/alerts/rules`, {
      headers: authHeaders(accessToken),
    })
    expect(rulesResp.status()).toBe(200)
    const rules = (await rulesResp.json()) as Array<{ type: string; enabled: boolean }>
    const lowRule = rules.find((r) => r.type === 'low_stock')
    expect(lowRule, 'no low_stock rule materialized after toggle').toBeTruthy()
    expect(lowRule!.enabled).toBe(false)

    // Reload and confirm the visible toggle still reflects the persisted state.
    await page.reload()
    await page.getByRole('button', { name: /alert rules/i }).click()
    await expect(page.getByTestId('settings-rule-low')).not.toBeChecked()
  })

  test('Billing tab renders REAL plan pulled from /billing/status (not "Locus Operator $399/mo")', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('settings-billing'))
    const reqs: { url: string; status: number }[] = []
    page.on('response', (resp) => reqs.push({ url: resp.url(), status: resp.status() }))
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /billing/i }).click()
    const plan = page.getByTestId('settings-billing-plan')
    await expect(plan).toBeVisible({ timeout: 8000 })
    // A new account is on the Free tier; the plan should be a real word, not the hardcoded marketing string.
    await expect(plan).not.toContainText('399')
    // The /billing/status call must have happened.
    const status = reqs.find((r) => /\/billing\/status/.test(r.url))
    expect(status?.status, 'billing/status not requested').toBe(200)
    // Tier badge should also render
    await expect(page.getByTestId('settings-billing-tier')).toBeVisible()
  })

  test('Billing tab "See plans" CTA links to /pricing', async ({ page }) => {
    await signup(page, uniqueEmail('settings-billing-cta'))
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /billing/i }).click()
    const cta = page.getByTestId('settings-billing-cta')
    await expect(cta).toHaveAttribute('href', '/pricing')
  })
})
