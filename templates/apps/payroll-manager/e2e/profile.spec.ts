import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, signupAndToken, totp } from './_helpers'

interface UserRow {
  id: string
  email: string
  twoFactorEnabled?: boolean
}

/** `GET /users/:id` answers with `{ props: {...}, plan: {...} }`; some bonds
 *  wrap that again in `{ data }`. Read every shape rather than falling through
 *  to the raw envelope — a fallback that returns the envelope makes
 *  `twoFactorEnabled` read `undefined` and any `Boolean(...) === false`
 *  assertion pass vacuously. */
function readUser(body: unknown): UserRow | undefined {
  const outer = body as { data?: unknown; props?: unknown } | undefined
  const unwrapped = (outer?.data ?? outer) as { props?: unknown } | undefined
  return (unwrapped?.props ?? unwrapped) as UserRow | undefined
}

test.describe('/profile', () => {
  test('renders signed-in user header', async ({ page }) => {
    const { user } = await signupAndToken(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible()
    // The hero card prints the email twice (h2 + secondary <p>), so
    // assert at least one match instead of being strict-mode picky.
    await expect(page.getByText(user.email).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Two-factor toggle persists on the user row', async ({ page }) => {
    // `twoFactorEnabled` is NOT an updatable field on the user resource:
    // `PATCH /users/:id { twoFactorEnabled: true }` answers 400
    // "No updatable fields were provided", because every 2FA state transition
    // must go through the TOTP step-up at `POST /users/:id/verify-two-factor`
    // (otherwise anyone holding a session could silently switch the second
    // factor off). So the flag can only be flipped by completing a genuine
    // enrollment — which is what this test drives: click Enable, take the
    // secret the server provisions, answer with the real code it implies, and
    // then confirm the server persisted the flag on the user row.
    const { token, user } = await signupAndToken(page)
    const before = await apiGet<unknown>(page, token, `/users/${user.id}`)
    expect(Boolean(readUser(before.body)?.twoFactorEnabled)).toBe(false)

    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible()
    await expect(page.getByText(/^Disabled$/)).toBeVisible({ timeout: 10_000 })

    // Arm the listener BEFORE the click so the setup body can't be missed.
    const setupResponse = page.waitForResponse(
      (r) =>
        /\/api\/users\/[0-9a-f-]+\/verify-two-factor(\?|$)/.test(r.url()) &&
        r.request().method() === 'POST',
      { timeout: 20_000 },
    )
    await page.locator('[data-mol-id="two-factor-enable"]').click()
    const setup = await setupResponse
    expect(setup.status(), 'POST verify-two-factor {action:setup} must succeed').toBeLessThan(400)
    const setupBody = (await setup.json()) as { secret?: string; data?: { secret?: string } }
    const secret = setupBody.secret ?? setupBody.data?.secret
    expect(secret, 'setup must provision a base32 TOTP secret').toBeTruthy()

    // Complete the enrollment with a real code derived from that secret.
    await page.locator('#profile-tf-token').fill(totp(secret!))
    await page.getByRole('button', { name: /verify & enable/i }).click()

    // UI-anchored: the modal closes and the row flips to the disable action.
    await expect(page.locator('[data-mol-id="two-factor-disable"]')).toBeVisible({
      timeout: 15_000,
    })

    const after = await apiGet<unknown>(page, token, `/users/${user.id}`)
    expect(
      Boolean(readUser(after.body)?.twoFactorEnabled),
      'two-factor must persist server-side after toggle',
    ).toBe(true)
    // No restore step: every spec signs up a fresh account, so nothing is
    // shared. (The previous `PATCH {twoFactorEnabled:false}` restore was a
    // no-op that the API rejected with a 400.)
  })

  test('Devices list issues a GET /api/devices', async ({ page }) => {
    const { token } = await signupAndToken(page)
    void token
    const reqs: { url: string; method: string }[] = []
    page.on('request', (r) => reqs.push({ url: r.url(), method: r.method() }))
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle').catch(() => {})
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/devices(\?|$)/.test(r.url)),
      'devices fetch must fire on profile mount',
    ).toBeDefined()
  })
})
