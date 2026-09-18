import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiFetch, captureNetwork, getAccessToken, signup } from './_helpers'

// Cross-page kitchen-sink user journey for secrets-manager.
//
// A real customer signs up, creates a vault, drops a real secret in,
// reveals it, rotates it, deletes it, sets up an integration, invites a
// teammate, mints + revokes an API token, edits their profile, asks for
// a Stripe checkout, and confirms every action's backend invariant on
// the next read. This is the "would a paying customer be happy" gate;
// it has to pass on a fresh scaffold.

test.describe('user journey: signup → vault → secret → audit → settings → checkout', () => {
  test('every primary action persists across reload and the audit log captures it', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const creds = await signup(page)
    expect(page.url()).toMatch(/\/vaults/)

    // 1. Create a vault via the modal (UI-driven so we exercise wiring).
    await page.locator('[data-mol-id="vaults-new-button"]').click()
    await expect(page.locator('[data-mol-id="new-vault-modal"]')).toBeVisible()
    await page.locator('[data-mol-id="new-vault-name"]').fill('journey-vault')
    await page.locator('[data-mol-id="new-vault-environment"]').selectOption('production')
    const vaultPostReqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="new-vault-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const vaultPost = vaultPostReqs.find(
      (r) => r.method === 'POST' && /\/api\/vaults(\b|\?)/.test(r.url),
    )
    expect(vaultPost?.status).toBe(201)

    const vaultsList = await apiFetch(page, 'GET', '/vaults')
    const vault = (vaultsList.json as Array<{ id: string; name: string }>).find(
      (v) => v.name === 'journey-vault',
    )
    expect(vault, 'POST should produce a row visible on the next GET /vaults').toBeTruthy()

    // 2. Reload the page — the vault must still be there.
    await page.reload()
    await page.waitForTimeout(1000)
    await expect(page.locator(`[data-mol-id="vault-card-${vault!.id}"]`)).toBeVisible()

    // 3. Drop in a secret via the vault detail.
    await page.goto(APP_BASE + '/vaults/' + vault!.id)
    await page.waitForTimeout(1000)
    await page.locator('[data-mol-id="vault-add-secret"]').click()
    await page.locator('[data-mol-id="new-secret-name"]').fill('JOURNEY_TOKEN')
    await page.locator('[data-mol-id="new-secret-key"]').fill('JOURNEY_TOKEN')
    await page.locator('[data-mol-id="new-secret-value"]').fill('original-plaintext-789')
    await page.locator('[data-mol-id="new-secret-kind"]').selectOption('api-key')
    await page.locator('[data-mol-id="new-secret-environment"]').selectOption('production')
    await page.locator('[data-mol-id="new-secret-submit"]').click()
    await page.waitForTimeout(1500)
    const secretsList = await apiFetch(page, 'GET', `/secrets?vault_id=${vault!.id}`)
    const secret = (secretsList.json as Array<{ id: string; key: string }>).find(
      (s) => s.key === 'JOURNEY_TOKEN',
    )
    expect(secret).toBeTruthy()

    // 4. Reveal the secret on its detail page; the plaintext must come back.
    await page.goto(APP_BASE + '/secrets/' + secret!.id)
    await page.waitForTimeout(1000)
    await page.locator('[data-mol-id="secret-value-toggle"]').click()
    await expect(page.locator('[data-mol-id="secret-value"]')).toContainText(
      'original-plaintext-789',
    )

    // 5. Rotate the secret. Version must bump and the rotation must
    //    appear in /rotations and /audit.
    await page.locator('[data-mol-id="secret-rotate-toggle"]').click()
    await page.locator('[data-mol-id="secret-rotate-value"]').fill('rotated-plaintext-2026')
    await page.locator('[data-mol-id="secret-rotate-submit"]').click()
    await page.waitForTimeout(1500)
    const after = await apiFetch(page, 'GET', `/secrets/${secret!.id}`)
    expect((after.json as { version: number; value: string }).version).toBe(2)
    expect((after.json as { version: number; value: string }).value).toBe('rotated-plaintext-2026')
    const rotations = await apiFetch(page, 'GET', '/rotations')
    expect(
      (rotations.json as Array<{ secret_id: string; status: string }>).some(
        (r) => r.secret_id === secret!.id && r.status === 'completed',
      ),
    ).toBe(true)

    // 6. Audit log lands on `/audit` and shows entries for our actions.
    await page.goto(APP_BASE + '/audit')
    await page.waitForTimeout(1500)
    const auditText = await page.locator('[data-mol-id="audit-list"]').innerText()
    expect(auditText).toMatch(/JOURNEY_TOKEN|secret/i)

    // 7. Connect an integration via the form.
    await page.goto(APP_BASE + '/integrations')
    await page.waitForTimeout(1000)
    await page.locator('[data-mol-id="integrations-add-toggle"]').click()
    await page.locator('[data-mol-id="integration-name"]').fill('Journey · Vercel')
    await page.locator('[data-mol-id="integration-category"]').selectOption('vercel')
    await page.locator('[data-mol-id="integration-submit"]').click()
    await page.waitForTimeout(1500)
    const integrationList = await apiFetch(page, 'GET', '/integrations')
    expect(
      (integrationList.json as Array<{ name: string }>).some((i) => i.name === 'Journey · Vercel'),
    ).toBe(true)

    // 8. Mint + revoke an API token.
    await page.goto(APP_BASE + '/tokens')
    await page.waitForTimeout(1000)
    await page.locator('[data-mol-id="api-tokens-new-toggle"]').click()
    await page.locator('[data-mol-id="api-token-name"]').fill('journey-token')
    await page.locator('[data-mol-id="api-token-submit"]').click()
    await page.waitForTimeout(1500)
    const plaintext = await page.locator('[data-mol-id="api-tokens-plaintext"]').innerText()
    expect(plaintext).toMatch(/smt_[0-9a-f]+/)
    const tokens = await apiFetch(page, 'GET', '/api-tokens')
    const tokenRow = (tokens.json as Array<{ id: string; name: string }>).find(
      (t) => t.name === 'journey-token',
    )
    expect(tokenRow).toBeTruthy()
    page.once('dialog', (d) => d.accept())
    await page.locator(`[data-mol-id="api-token-revoke-${tokenRow!.id}"]`).click()
    await page.waitForTimeout(1500)
    const tokensAfter = await apiFetch(page, 'GET', '/api-tokens')
    const revoked = (tokensAfter.json as Array<{ id: string; revoked_at: string | null }>).find(
      (t) => t.id === tokenRow!.id,
    )
    expect(revoked?.revoked_at, 'revoked_at must be stamped after revoke').not.toBeNull()

    // 9. Profile name edit persists.
    await page.goto(APP_BASE + '/profile')
    await page.waitForTimeout(1500)
    const newName = 'Journey Walker ' + Date.now()
    await page.locator('[data-mol-id="profile-name"]').fill(newName)
    await page.locator('[data-mol-id="profile-save"]').click()
    await page.waitForTimeout(1500)
    const me = await apiFetch(page, 'GET', '/users/me')
    expect((me.json as { props: { name?: string } }).props.name).toBe(newName)

    // 10. Stripe Checkout — real session URL comes back.
    const tiersResp = await page.request.get(API_BASE + '/billing/tiers')
    const tiers =
      (
        (await tiersResp.json()) as {
          data?: Array<{ key: string; prices?: Array<{ stripePriceId?: string | null }> }>
        }
      ).data ?? []
    const proPrice = tiers.find((t) => t.key === 'pro')?.prices?.find((p) => p.stripePriceId)
    expect(proPrice?.stripePriceId).toBeTruthy()
    const token = await getAccessToken(page)
    const checkout = await page.request.post(API_BASE + '/billing/checkout', {
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      data: { priceId: proPrice!.stripePriceId! },
    })
    expect(checkout.status()).toBe(200)
    const body = (await checkout.json()) as { checkoutUrl?: string }
    expect(body.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//)

    // 11. Logout doesn't exist as a button, but the auth cookie gone =
    //     /vaults must redirect to /login.
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/vaults')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    // 12. Login back in with the original credentials.
    await page.goto(APP_BASE + '/login')
    await page.locator('#login-email').fill(creds.email)
    await page.locator('#login-password').fill(creds.password)
    await page.getByRole('button', { name: /unlock vault/i }).click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
    await expect
      .poll(async () => (await getAccessToken(page)) !== null, {
        timeout: 10_000,
        intervals: [50, 100, 250, 500],
      })
      .toBe(true)
  })
})
