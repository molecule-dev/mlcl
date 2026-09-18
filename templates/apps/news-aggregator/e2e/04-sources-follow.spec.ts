import { expect, test, type Page } from '@molecule/app-e2e-fixtures-default'

import {
  type AuthedFetchInit,
  APP_BASE,
  getAccessTokenFromPage,
  pickSource,
  pickTwoSources,
  signup,
  uniqueEmail,
} from './_helpers.js'

/** Authenticated browser-side fetch using the JWT stored by @molecule/app-auth. */
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

test.describe('source follow', () => {
  test('source detail Follow persists across reload + read-after-write GET', async ({ page }) => {
    await signup(page, uniqueEmail('na-src-follow'))
    // Follow whichever source the app holds — naming a seeded slug breaks the
    // spec the moment the demo sources are replaced.
    const source = await pickSource(page)

    const initialResp = page.waitForResponse(
      (r) => new RegExp(`/api/sources/by-slug/${source.slug}`).test(r.url()) && r.status() === 200,
    )
    await page.goto(APP_BASE + `/sources/${source.slug}`)
    await initialResp

    const btn = page.getByRole('button', { name: /^Follow$|^Following$/ }).first()
    await expect(btn).toBeVisible()
    await expect(btn).toHaveAttribute('aria-pressed', 'false')

    const [followResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/sources/${source.slug}/follow`) && r.request().method() === 'POST',
      ),
      btn.click(),
    ])
    expect(followResp.status()).toBe(200)
    const followBody = (await followResp.json()) as { following: boolean }
    expect(followBody.following).toBe(true)
    await expect(btn).toHaveAttribute('aria-pressed', 'true')

    // Read-after-write: GET source returns following=true.
    const detail = await authedFetch<{ following: boolean }>(
      page,
      `/api/sources/by-slug/${source.slug}`,
    )
    expect(detail.following).toBe(true)

    // Reload — persisted.
    const reloadResp = page.waitForResponse(
      (r) => new RegExp(`/api/sources/by-slug/${source.slug}`).test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.reload()
    await reloadResp
    const after = page.getByRole('button', { name: /^Follow$|^Following$/ }).first()
    await expect(after).toHaveAttribute('aria-pressed', 'true')
  })

  test('Sources page filter "Following" only shows sources I actually follow', async ({ page }) => {
    await signup(page, uniqueEmail('na-src-filter'))

    // Follow one of the app's own sources — and keep a second, unrelated one
    // to prove the filter actually excludes what is not followed.
    const { target, other } = await pickTwoSources(page)
    const followed = await authedFetch<{ following: boolean }>(
      page,
      `/api/sources/${target.slug}/follow`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    )
    expect(followed.following).toBe(true)

    await page.goto(APP_BASE + '/sources')
    await page.waitForResponse((r) => r.url().endsWith('/api/sources') && r.status() === 200)

    // Click Following filter.
    await page
      .getByRole('button', { name: /^Following$/ })
      .first()
      .click()

    // The followed source is visible after the filter; the other is not.
    await expect(page.getByText(target.name).first()).toBeVisible()
    await expect(page.getByText(other.name)).toHaveCount(0)
  })
})
