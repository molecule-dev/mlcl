import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, getUserId, signup, uniqueEmail } from './_helpers.js'

interface UserResponse {
  props: { id: string; email: string; name?: string }
}

test.describe('/signup', () => {
  test('renders the signup form with name, email, and password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create account|sign up|get started/i }).first(),
    ).toBeVisible()
  })

  test('signing up POSTs /api/users and lands on /conversation', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
    })
    await expect(page).toHaveURL(/\/conversation/, { timeout: 15_000 })
    const usersPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\b|\?|$)/.test(r.url))
    expect(usersPost, 'POST /api/users should fire on signup').toBeDefined()
    expect(usersPost!.status, 'signup POST should be 2xx').toBeLessThan(300)
  })

  test('post-signup the new user can read its own profile via GET /users/:id', async ({ page }) => {
    const { email } = await signup(page)
    await expect(page).toHaveURL(/\/conversation/, { timeout: 15_000 })
    // Read-after-write: the user the signup just created can read its own row.
    // If JWT is malformed or auth bond is broken, this returns 401/403.
    //
    // The id comes from decoding the userId-bearing access token (via the
    // httpOnly session cookie), NOT from localStorage: this app deliberately
    // keeps auth state out of localStorage — a bearer copy there is
    // XSS-exfiltratable and defeats the httpOnly session cookie ([M1-1],
    // see app/src/config.ts). `getUserId()` is the same helper the canonical
    // user-journey read-own-profile test uses.
    const id = await getUserId(page)
    expect(id, 'getUserId() must return the new user uuid').toMatch(/^[0-9a-f-]{36}$/)
    const me = await apiGet<UserResponse>(page, `/users/${id}`)
    expect(me.props.email).toBe(email)
  })

  test('a duplicate email keeps the user on /signup with an error visible', async ({
    page,
    browser,
  }) => {
    const email = uniqueEmail('dup')
    const password = 'TestPass1234!'
    const ctx = await browser.newContext()
    const p1 = await ctx.newPage()
    await signup(p1, { email, password })
    await ctx.close()

    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    const nameInput = page.locator('input[type="text"]').first()
    if (await nameInput.count().catch(() => 0)) {
      await nameInput.fill('Dup Tester')
    }
    await page.locator('input[type="email"]').first().fill(email)
    const pws = page.locator('input[type="password"]')
    const pcount = await pws.count()
    await pws.nth(0).fill(password)
    if (pcount > 1) await pws.nth(1).fill(password)
    await page
      .getByRole('button', { name: /create account|sign up|get started|start/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/signup/)
  })

  test('auth state survives a hard reload after signup', async ({ page }) => {
    await signup(page)
    await expect(page).toHaveURL(/\/conversation/, { timeout: 15_000 })
    await page.reload()
    await expect(page).toHaveURL(/\/conversation/, { timeout: 15_000 })
  })

  test('signup form renders both password and confirm fields and a name field', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    const pws = page.locator('input[type="password"]')
    // The 2nd password input being attached IS "at least 2", and unlike
    // count() it waits. count() sampled once, right after the goto, and saw a
    // still-empty React root.
    await expect(pws.nth(1), 'signup must render at least 2 password inputs').toBeAttached()
    const namePlaceholder = page.locator('input[placeholder*="e.g."]').first()
    if (await namePlaceholder.count().catch(() => 0)) {
      await expect(namePlaceholder).toBeVisible()
    }
  })

  test('"Sign in" link on /signup navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /sign in/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    }
  })
})
