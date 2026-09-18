import { expect, test, type Page } from '@molecule/app-e2e-fixtures-default'

import {
  type AuthedFetchInit,
  APP_BASE,
  getAccessTokenFromPage,
  pickTopic,
  signup,
  uniqueEmail,
} from './_helpers.js'

async function authedFetch<T>(page: Page, url: string, init: AuthedFetchInit = {}): Promise<T> {
  const token = await getAccessTokenFromPage(page)
  return page.evaluate(
    async (args) => {
      const headers = { ...(args.init.headers || {}), Authorization: `Bearer ${args.token}` }
      const resp = await fetch(args.url, { ...args.init, headers })
      return (await resp.json()) as unknown
    },
    { url, init, token },
  ) as Promise<T>
}

test.describe('topic follow', () => {
  test('Follow toggles persist on the server and survive reload', async ({ page }) => {
    await signup(page, uniqueEmail('na-topic-follow'))
    // Follow whichever topic the app holds — naming a seeded slug breaks the
    // spec the moment the demo topics are replaced.
    const topic = await pickTopic(page)

    await page.goto(APP_BASE + `/topics/${topic.slug}`)
    await page.waitForResponse(
      (r) => new RegExp(`/api/topics/${topic.slug}(\\?|$)`).test(r.url()) && r.status() === 200,
    )

    const btn = page.getByRole('button', { name: /^Follow$|^Following$/ }).first()
    await expect(btn).toBeVisible()
    await expect(btn).toHaveAttribute('aria-pressed', 'false')

    const [followResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/topics/${topic.slug}/follow`) && r.request().method() === 'POST',
      ),
      btn.click(),
    ])
    expect(followResp.status()).toBe(200)
    const followBody = (await followResp.json()) as { following: boolean }
    expect(followBody.following).toBe(true)

    // UI reflects the persisted state.
    await expect(btn).toHaveAttribute('aria-pressed', 'true')

    // Read-after-write: a fresh GET reflects following=true.
    const detail = await authedFetch<{ following: boolean }>(page, `/api/topics/${topic.slug}`)
    expect(detail.following).toBe(true)

    // Reload preserves the persisted following state.
    await page.reload()
    await page.waitForResponse(
      (r) => new RegExp(`/api/topics/${topic.slug}(\\?|$)`).test(r.url()) && r.status() === 200,
    )
    const btnAfter = page.getByRole('button', { name: /^Follow$|^Following$/ }).first()
    await expect(btnAfter).toHaveAttribute('aria-pressed', 'true')

    // Toggle off.
    const [unfollowResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/topics/${topic.slug}/follow`) && r.request().method() === 'POST',
      ),
      btnAfter.click(),
    ])
    expect(unfollowResp.status()).toBe(200)
    const unfollowBody = (await unfollowResp.json()) as { following: boolean }
    expect(unfollowBody.following).toBe(false)
    await expect(btnAfter).toHaveAttribute('aria-pressed', 'false')
  })
})
