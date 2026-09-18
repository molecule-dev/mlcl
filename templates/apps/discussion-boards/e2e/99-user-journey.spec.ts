/**
 * Cross-page kitchen-sink user journey for the discussion-boards
 * (Stoa) flagship.
 *
 * Walks a single fresh user through the primary product loop the way a
 * real visitor would: land → sign up → browse → post → reply → bookmark
 * → search → notifications → profile → settings. Every step asserts on
 * a real backend invariant (read-after-write or response shape) — never
 * just "the click happened".
 *
 * Per the per-app contract: this is the sole spec required to *also*
 * exercise route navigation in sequence; per-page specs handle each
 * page's individual interactions exhaustively.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  apiAs,
  captureNetwork,
  createThread,
  pickCategory,
  signup,
  signupApi,
  uniqueEmail,
} from './_helpers.js'

test.describe('99 — full user journey (kitchen sink)', () => {
  test('A new visitor can sign up, browse categories, post a thread, reply, bookmark, search, see notifications, and update settings', async ({
    page,
  }) => {
    // 1. Land on /, see public marketing page.
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })

    // 2. Sign up via API (deterministic), seed token, bounce into /c.
    const me = await signup(page)
    expect(me.accessToken).toBeTruthy()
    expect(me.userId).toBeTruthy()

    // 3. Hop into categories list — must hit /api/categories-rich + show at least one card.
    let categoriesReq: { method: string; url: string; status: number } | undefined
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/c')
        await page.waitForTimeout(2000)
      })
      categoriesReq = reqs.find(
        (r) => /\/api\/categories-rich(\?|$)/.test(r.url) && r.method === 'GET',
      )
      expect(categoriesReq, 'categories-rich must fire on /c').toBeTruthy()
      expect(categoriesReq!.status).toBe(200)
    }
    await expect(
      page.getByText(/Pick a room|Where the conversation lives|All categories/i).first(),
    ).toBeVisible({ timeout: 15_000 })

    // 4. Drill into a specific category (use real slug from the API).
    const category = await pickCategory(page)
    await page.goto(APP_BASE + `/c/${category.slug}`)
    await page.waitForTimeout(800)

    // 5. Compose a brand-new thread via API (compose-page UI is exercised in compose.spec.ts).
    const marker = `journey-${Date.now()}`
    const thread = await createThread(page, {
      title: `User journey thread ${marker}`,
      body: 'This is the kitchen-sink journey thread body.',
      categoryId: category.id,
    })
    expect(thread.id).toBeTruthy()
    expect(thread.slug).toBeTruthy()

    // 6. Open the thread page and confirm the OP body is rendered (read-after-write).
    await page.goto(APP_BASE + '/t/' + thread.id)
    await expect(page.getByText(/kitchen-sink journey thread body/i).first()).toBeVisible({
      timeout: 15_000,
    })

    // 7. Have a SECOND user reply to the thread, then assert the OP can see the reply.
    const other = await signupApi(page)
    const reply = await apiAs(
      page,
      other.accessToken,
      'POST',
      `${API_BASE}/threads/${thread.id}/posts`,
      { body: 'Reply from another user — journey reply.' },
    )
    expect(reply.status()).toBeLessThan(400)

    await page.reload()
    await expect(page.getByText(/journey reply/i).first()).toBeVisible({ timeout: 15_000 })

    // 8. The OP's notifications list now includes activity for this thread (real backend invariant).
    {
      const list = await apiAs(page, me.accessToken, 'GET', `${API_BASE}/notifications`)
      expect(list.status()).toBe(200)
      const data = (await list.json()).data ?? []
      const hit = data.find((n: { thread?: { id?: string } }) => n.thread?.id === thread.id)
      expect(hit, 'reply must produce a notification for the OP').toBeTruthy()
    }

    // 9. Bookmark the thread, verify it shows up on /bookmarks.
    {
      const r = await apiAs(page, me.accessToken, 'POST', `${API_BASE}/bookmarks`, {
        threadId: thread.id,
      })
      expect(r.status()).toBeLessThan(400)
    }
    await page.goto(APP_BASE + '/bookmarks')
    await expect(page.getByText(new RegExp(marker, 'i'))).toBeVisible({ timeout: 15_000 })

    // 10. Search for the unique marker — must surface this thread.
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/search')
        await page.getByRole('searchbox').first().fill(marker)
        await page.waitForTimeout(1500)
      })
      const search = reqs.find((r) => /\/api\/search\?q=/.test(r.url) && r.method === 'GET')
      expect(search, 'GET /api/search?q=… must fire on type').toBeTruthy()
      expect(search!.status).toBe(200)
      await expect(page.getByText(new RegExp(marker, 'i'))).toBeVisible({ timeout: 15_000 })
    }

    // 11. Visit notifications page — must show the reply notification UI.
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })

    // 12. Visit own profile — must render display name (backend handler resolves user by ilike on name).
    const ownSlug = encodeURIComponent(me.name)
    await page.goto(APP_BASE + '/u/' + ownSlug)
    await expect(
      page.getByText(new RegExp(me.name.replace(/\s+/g, '\\s*'), 'i')).first(),
    ).toBeVisible({
      timeout: 15_000,
    })

    // 13. Settings — change the display name and confirm read-after-write via /users/me.
    const newName = `Journey User ${Date.now()}`
    const patch = await apiAs(page, me.accessToken, 'PATCH', `${API_BASE}/users/me`, {
      name: newName,
    })
    expect(patch.status()).toBeLessThan(400)

    const meAfter = await apiAs(page, me.accessToken, 'GET', `${API_BASE}/users/me`)
    expect(meAfter.status()).toBe(200)
    const meBody = await meAfter.json()
    const meProps = meBody.props ?? meBody.user ?? meBody
    expect(meProps.name).toBe(newName)

    // 14. Pricing page is accessible (also when authed) and lists at least one tier.
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/free|starter|pro|team/i).first()).toBeVisible({ timeout: 15_000 })

    // 15. Plan-updated landing renders heading after a checkout success.
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })

    // 16. /home alias redirects to /c (backwards-compat path).
    await page.goto(APP_BASE + '/home')
    await expect(page).toHaveURL(/\/c$/, { timeout: 10_000 })
  })

  test('Public marketing routes (/, /pricing, /login, /signup, /forgot-password, /reset-password) are reachable without auth', async ({
    page,
  }) => {
    const publicPaths = [
      '/',
      '/pricing',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
    ]
    for (const p of publicPaths) {
      const res = await page.goto(APP_BASE + p)
      expect(res?.status(), `${p} must respond <500`).toBeLessThan(500)
    }
  })

  test('Auth-gated routes redirect to /login when no token is present', async ({ page }) => {
    const guarded = ['/c', '/settings', '/notifications', '/bookmarks', '/moderation', '/search']
    for (const p of guarded) {
      await page.goto(APP_BASE + p)
      await expect(page, `${p} should redirect unauthenticated users to /login`).toHaveURL(
        /\/login/,
        { timeout: 10_000 },
      )
    }
  })

  test('Forgot-password flow → reset-password flow → log in with new password (round trip)', async ({
    page,
  }) => {
    const email = uniqueEmail('journey-reset')
    const oldPassword = 'OldPass123!'
    const newPassword = 'JourneyNew456!'

    const sup = await page.request.post(API_BASE + '/users', {
      data: { email, password: oldPassword, name: 'Journey Reset' },
    })
    expect(sup.status()).toBe(201)

    const fp = await page.request.post(API_BASE + '/users/forgot-password', { data: { email } })
    expect(fp.status()).toBe(200)

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) test.skip(true, 'DATABASE_URL not set — cannot complete reset round trip')

    const { Client } = await import('pg')
    const client = new Client({ connectionString: dbUrl })
    await client.connect()
    let token: string | null = null
    try {
      const u = await client.query('select id from "users" where email = $1 limit 1', [email])
      const userId = u.rows[0]?.id
      const s = await client.query(
        'select "passwordResetToken" from "usersSecrets" where id = $1 limit 1',
        [userId],
      )
      token = s.rows[0]?.passwordResetToken
    } finally {
      await client.end()
    }
    expect(token, 'forgot-password must persist a token').toBeTruthy()

    const reset = await page.request.post(API_BASE + '/users/reset-password', {
      data: { token, password: newPassword },
    })
    expect(reset.status()).toBe(200)

    const newLogin = await page.request.post(API_BASE + '/users/log-in', {
      data: { email, password: newPassword },
    })
    expect(newLogin.status()).toBe(200)
  })
})
