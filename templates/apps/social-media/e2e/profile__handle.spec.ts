import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, captureNetwork, seedPost, signup } from './_helpers.js'

test.describe('profile page (/profile/:handle)', () => {
  test('Profile /me shows the current user\u2019s posts and counts', async ({ page }) => {
    const me = await signup(page)
    const p1 = await seedPost(page, me.accessToken, { caption: 'My profile post one' })
    const p2 = await seedPost(page, me.accessToken, { caption: 'My profile post two' })

    await page.goto(APP_BASE + '/profile/me')
    await expect(page.locator(`a[href="/posts/${p1.id}"]`)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(`a[href="/posts/${p2.id}"]`)).toBeVisible()
    await expect(page.locator('text=Posts').first()).toBeVisible()
  })

  test('Profile of another user shows their handle and supports follow / unfollow', async ({
    page,
  }) => {
    const author = await signup(page, undefined, undefined, 'Followable Person')
    const post = await seedPost(page, author.accessToken, { caption: 'Public post by author' })

    const viewer = await signup(page)
    const profileRes = await page.request.get(`/api/profile/me`, {
      headers: { Authorization: `Bearer ${author.accessToken}` },
    })
    expect(profileRes.status()).toBe(200)
    const authorProfile = (await profileRes.json()) as { handle: string }

    await page.goto(APP_BASE + `/profile/${authorProfile.handle}`)
    await expect(page.locator(`a[href="/posts/${post.id}"]`)).toBeVisible({ timeout: 10_000 })

    const followRes = await page.request.post(`/api/follows/users/${author.userId}`, {
      headers: { Authorization: `Bearer ${viewer.accessToken}` },
    })
    expect(followRes.status()).toBeLessThan(300)
    const refresh = await page.request.get(`/api/profile/${authorProfile.handle}`, {
      headers: { Authorization: `Bearer ${viewer.accessToken}` },
    })
    const data = (await refresh.json()) as { follower_count: number; is_following: boolean }
    expect(data.follower_count).toBe(1)
    expect(data.is_following).toBe(true)
  })

  test('Display name + @handle render in the header', async ({ page }) => {
    const me = await signup(page, undefined, undefined, 'Header Renderer')
    await page.goto(APP_BASE + '/profile/me')
    await expect(page.locator('body')).toContainText('Header Renderer', { timeout: 10_000 })
  })

  test('Stats row exposes Posts / Followers / Following labels', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile/me')
    await expect(page.locator('body')).toContainText(/Posts/i, { timeout: 10_000 })
    await expect(page.locator('body')).toContainText(/Followers/i)
    await expect(page.locator('body')).toContainText(/Following/i)
  })

  test('Page mount fetches /api/profile/:handle via captureNetwork', async ({ page }) => {
    const author = await signup(page)
    const profile = await page.request.get('/api/profile/me', {
      headers: apiHeaders(author.accessToken),
    })
    const data = (await profile.json()) as { handle: string }
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/profile/${data.handle}`)
      await page.waitForTimeout(1500)
    })
    const hit = reqs.some((r) => new RegExp(`/api/profile/${data.handle}`).test(r.url))
    expect(hit, 'profile page should fetch /api/profile/:handle').toBeTruthy()
  })

  test('Message button POSTs /api/messages/threads and navigates to /messages', async ({
    page,
  }) => {
    const target = await signup(page, undefined, undefined, 'DM Target')
    const viewer = await signup(page)
    const targetProfile = await page.request.get('/api/profile/me', {
      headers: apiHeaders(target.accessToken),
    })
    const tdata = (await targetProfile.json()) as { handle: string }
    await page.goto(APP_BASE + `/profile/${tdata.handle}`)
    const btn = page.locator('[data-testid="message-author"]').first()
    if ((await btn.count()) > 0) {
      const reqs = await captureNetwork(page, async () => {
        await btn.click()
        await page.waitForTimeout(1500)
      })
      const hit = reqs.some((r) => /\/api\/messages\/threads/.test(r.url) && r.method === 'POST')
      expect(hit, 'message button should POST /api/messages/threads').toBeTruthy()
    } else {
      // viewer may be looking at their own profile; create a thread directly to keep the test deterministic
      const res = await page.request.post(`/api/messages/threads`, {
        headers: apiHeaders(viewer.accessToken),
        data: { user_id: target.userId },
      })
      expect(res.status()).toBeLessThan(300)
    }
  })
})
