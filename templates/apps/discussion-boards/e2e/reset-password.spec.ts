import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/reset-password', () => {
  test('Email field accepts typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const email = page.locator('#reset-email')
    await email.fill('alice@example.com')
    await expect(email).toHaveValue('alice@example.com')
  })

  test('Email field is prefilled from ?email=', async ({ page }) => {
    const email = uniqueEmail('reset-pref')
    await page.goto(APP_BASE + '/reset-password?email=' + encodeURIComponent(email))
    await expect(page.locator('#reset-email')).toHaveValue(email)
  })

  test('Token field accepts typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const token = page.locator('#reset-token')
    await token.fill('abcdef1234567890')
    await expect(token).toHaveValue('abcdef1234567890')
  })

  test('Token field is prefilled from ?token=', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=somelongtoken123')
    await expect(page.locator('#reset-token')).toHaveValue('somelongtoken123')
  })

  test('Password and confirm fields accept typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('#reset-password').fill('NewPass123!')
    await page.locator('#reset-confirm').fill('NewPass123!')
    await expect(page.locator('#reset-password')).toHaveValue('NewPass123!')
    await expect(page.locator('#reset-confirm')).toHaveValue('NewPass123!')
  })

  test('Mismatched password and confirm shows mismatch error', async ({ page }) => {
    await page.goto(
      APP_BASE + '/reset-password?token=tok&email=' + encodeURIComponent(uniqueEmail('rm')),
    )
    await page.locator('#reset-password').fill('NewPass123!')
    await page.locator('#reset-confirm').fill('Different123!')
    await page.getByRole('button', { name: /Reset password/i }).click()
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible({ timeout: 5_000 })
  })

  test('Back to sign in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 })
  })

  test('Submit fires POST /api/users/reset-password with token+password (captureNetwork invariant)', async ({
    page,
  }) => {
    // The deliberately-invalid token is rejected 401 by the backend; the
    // browser logs that failed fetch to the console. Expected — allow it.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    const email = uniqueEmail('reset-net')
    await page.goto(
      APP_BASE +
        '/reset-password?email=' +
        encodeURIComponent(email) +
        '&token=fake-token-1234567890abcdef1234',
    )
    await page.locator('#reset-password').fill('NewPass123!')
    await page.locator('#reset-confirm').fill('NewPass123!')

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Reset password/i }).click()
      await page.waitForTimeout(1500)
    })
    const reset = reqs.find(
      (r) => /\/api\/users\/reset-password$/.test(r.url) && r.method === 'POST',
    )
    expect(reset, 'POST /api/users/reset-password must fire on submit').toBeTruthy()
    // Bad token returns 401, which is the correct backend response — what matters is the call landed.
    expect([200, 401]).toContain(reset!.status)
  })

  test('Bad token returns 401 from POST /api/users/reset-password (no silent success)', async ({
    page,
  }) => {
    const res = await page.request.post(API_BASE + '/users/reset-password', {
      data: { token: 'definitely-not-a-real-token-' + Date.now(), password: 'NewPass123!' },
    })
    expect(res.status()).toBe(401)
  })

  test('Forgot round trip: the DB-stored token is a HASH — presenting it is rejected and the old password still works', async ({
    page,
  }) => {
    // The platform stores only sha256(token); the RAW token exists solely in
    // the reset email, so an e2e run cannot read a usable token out of the
    // DB. Assert the security property instead: a DB dump must NOT grant a
    // password reset.
    const email = uniqueEmail('reset-e2e')
    const oldPassword = 'OldPass123!'

    const signup = await page.request.post(API_BASE + '/users', {
      data: { email, password: oldPassword, name: 'Reset E2E' },
    })
    expect(signup.status()).toBe(201)

    const forgot = await page.request.post(API_BASE + '/users/forgot-password', {
      data: { email },
    })
    // Always 200 (anti-enumeration), whether or not the email exists.
    expect(forgot.status()).toBe(200)

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) test.skip(true, 'DATABASE_URL not set — cannot verify token hashing at rest')

    const { Client } = await import('pg')
    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    let token: string | null = null
    try {
      const userQ = await client.query('select id from "users" where email = $1 limit 1', [email])
      const userId = userQ.rows[0]?.id
      expect(userId, 'must have created the user').toBeTruthy()
      const secQ = await client.query(
        'select "passwordResetToken" from "usersSecrets" where id = $1 limit 1',
        [userId],
      )
      token = secQ.rows[0]?.passwordResetToken
    } finally {
      await client.end()
    }
    expect(token, 'forgot-password must persist a passwordResetToken').toBeTruthy()

    const reset = await page.request.post(API_BASE + '/users/reset-password', {
      data: { token, password: 'BrandNew456!' },
    })
    expect(reset.status(), 'the DB-stored value must NOT complete a reset').toBe(401)

    const oldLogin = await page.request.post(API_BASE + '/users/log-in', {
      data: { email, password: oldPassword },
    })
    expect(oldLogin.status(), 'old password must still work (no reset occurred)').toBe(200)
  })
})
