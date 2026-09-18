import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  apiFetch,
  captureNetwork,
  envToneOf,
  listFlags,
  pickEnabledFlag,
  pickFlag,
  pickTwoEnvironmentFlags,
  pickTwoFlags,
  signup,
  stateOf,
  waitForSeed,
} from './_helpers'

// /flags — list of all flags. Filters: env (all/production/staging/
// development), state (all/on/off/killed), search box. Each row deep-links
// to /flags/:key. Every spec below reads the flags it drives out of
// GET /api/flags, so the suite still holds once the starter workspace is
// replaced with the owner's own flags.

test.describe('/flags', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/flags')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup+seed, GET /api/flags fires and every flag renders a row', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const flags = await listFlags(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/flags')
      await page.waitForTimeout(1500)
    })
    const flagsGet = reqs.find((r) => r.method === 'GET' && /\/api\/flags(\?|$)/.test(r.url))
    expect(flagsGet).toBeDefined()
    expect(flagsGet!.status).toBe(200)
    await expect(page.locator('[data-mol-id^="flag-row-"]')).toHaveCount(flags.length)
    for (const flag of flags) {
      await expect(page.locator(`[data-mol-id="flag-row-${flag.key}"]`)).toBeVisible()
    }
  })

  test('"New flag" CTA navigates to /flags/new', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/flags')
    await page.locator('[data-mol-id="flags-new-link"]').click()
    await expect(page).toHaveURL(/\/flags\/new$/)
  })

  test('clicking a flag row deep-links to /flags/:key', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const flag = await pickFlag(page)
    await page.goto(APP_BASE + '/flags')
    await page.waitForTimeout(1000)
    await page.locator(`a[href="/flags/${flag.key}"]`).first().click()
    await expect(page).toHaveURL(new RegExp(`/flags/${flag.key}`))
  })

  test('search filters the list to matching key/name', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    // Two flags whose keys do not contain one another, so searching one must
    // exclude the other.
    const { target, other } = await pickTwoFlags(page)
    await page.goto(APP_BASE + '/flags')
    await page.locator('[data-mol-id="flags-search"]').fill(target.key)
    await page.waitForTimeout(500)
    await expect(page.locator(`[data-mol-id="flag-row-${target.key}"]`)).toBeVisible()
    await expect(page.locator(`[data-mol-id="flag-row-${other.key}"]`)).toHaveCount(0)
  })

  test('state filter "off" shows exactly the flags that are off', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const flags = await listFlags(page)
    const off = flags.filter((f) => stateOf(f) === 'off')
    await page.goto(APP_BASE + '/flags')
    await page.locator('[data-mol-id="state-filter-off"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-mol-id^="flag-row-"]')).toHaveCount(off.length)
    if (off.length === 0) {
      await expect(page.getByText(/no flags match your filters/i)).toBeVisible()
    } else {
      for (const flag of off) {
        await expect(page.locator(`[data-mol-id="flag-row-${flag.key}"]`)).toBeVisible()
      }
    }
  })

  test('env filter narrows the list to the flags scoped to that environment', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    // The env chips are the app's own fixed list; which flags sit behind them
    // is workspace content, so read the pair under test from the API.
    const { target, other } = await pickTwoEnvironmentFlags(page)
    await page.goto(APP_BASE + '/flags')
    await page.locator(`[data-mol-id="env-filter-${envToneOf(target)}"]`).click()
    await page.waitForTimeout(300)
    await expect(page.locator(`[data-mol-id="flag-row-${target.key}"]`)).toBeVisible()
    await expect(page.locator(`[data-mol-id="flag-row-${other.key}"]`)).toHaveCount(0)
  })

  test('inline toggle PUT /api/flags/:id/toggle flips is_enabled in the DB', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    // Whichever flag is currently on — toggling it must turn it off.
    const target = await pickEnabledFlag(page)
    await page.goto(APP_BASE + '/flags')
    await page.waitForTimeout(1000)
    // Click the row's toggle (FlagToggle button has aria-label "Toggle <key>")
    const reqs = await captureNetwork(page, async () => {
      await page
        .locator(`[data-mol-id="flag-row-${target.key}"]`)
        .getByRole('button', { name: /toggle/i })
        .click()
      await page.waitForTimeout(1500)
    })
    const togglePut = reqs.find(
      (r) => r.method === 'PUT' && new RegExp(`/api/flags/${target.id}/toggle`).test(r.url),
    )
    expect(togglePut, 'PUT toggle should fire').toBeDefined()
    expect(togglePut!.status).toBe(200)
    // Confirm DB reflects the toggle.
    const after = await apiFetch(page, 'GET', `/flags/${target.id}`)
    expect((after.json as { is_enabled: boolean }).is_enabled).toBe(false)
  })
})
