import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  getDashboardSummary,
  getWedding,
  signup,
  uniqueEmail,
} from './_helpers.js'

/**
 * The signature flow: the couple's code is public; a guest finds their own
 * name and answers once — no account, no email. The couple's tally updates.
 * Expected values are always read from the API inside the test (the starter
 * kit is per-user seeded content that a real project replaces on day one).
 */
test.describe('/rsvp/:code public collection', () => {
  test('unknown code renders the not-found page', async ({ page }) => {
    await page.goto(APP_BASE + '/rsvp/NO-SUCH-WEDDING-000')
    await expect(page.locator('[data-mol-id="page-rsvp-not-found"]')).toBeVisible({
      timeout: 10000,
    })
  })

  test('a wrong name finds nothing and reveals no guest list', async ({ page }) => {
    const email = uniqueEmail('rsvp-wrong')
    const { accessToken } = await signup(page, email)
    const wedding = await getWedding(page, accessToken)

    await page.goto(APP_BASE + `/rsvp/${wedding.rsvp_code}`)
    await expect(page.locator('[data-mol-id="rsvp-lookup"]')).toBeVisible({
      timeout: 10000,
    })
    await page.locator('[data-mol-id="rsvp-name-input"]').fill('Definitely Not Invited')
    await page.locator('[data-mol-id="rsvp-lookup-submit"]').click()
    await expect(page.locator('[data-mol-id="rsvp-lookup-error"]')).toBeVisible({
      timeout: 10000,
    })
    // Still on step 1 — no names leaked into the DOM.
    await expect(page.locator('[data-mol-id="rsvp-respond"]')).toHaveCount(0)
  })

  test('guest confirms yes with a meal and the dashboard tally updates', async ({ page }) => {
    const email = uniqueEmail('rsvp-yes')
    const { accessToken } = await signup(page, email)
    const wedding = await getWedding(page, accessToken)

    // Pick a real pending guest from the API.
    const guests = (await (
      await page.request.get(`${API_BASE}/guests?status=pending`, {
        headers: apiHeaders(accessToken),
      })
    ).json()) as Array<{ id: string; name: string }>
    const guest = guests[0]
    expect(guest, 'starter kit should include at least one pending guest').toBeTruthy()

    await page.goto(APP_BASE + `/rsvp/${wedding.rsvp_code}`)
    await page.locator('[data-mol-id="rsvp-name-input"]').fill(guest.name)
    await page.locator('[data-mol-id="rsvp-lookup-submit"]').click()

    await expect(page.locator('[data-mol-id="rsvp-respond"]')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('[data-mol-id="page-rsvp"]')).toContainText(guest.name)

    await page.locator('[data-mol-id="rsvp-choice-yes"]').click()
    const mealSelect = page.locator('[data-mol-id="rsvp-meal-select"]')
    if (await mealSelect.count()) {
      const options = await mealSelect.locator('option').allTextContents()
      const firstMeal = options.find((o) => o.trim() && !/no preference/i.test(o))
      if (firstMeal) await mealSelect.selectOption({ label: firstMeal })
    }
    await page.locator('[data-mol-id="rsvp-respond-submit"]').click()

    await expect(page.locator('[data-mol-id="rsvp-confirmed"]')).toBeVisible({
      timeout: 10000,
    })

    // The couple's side sees it: API status flips and the dashboard chip counts.
    const after = (await (
      await page.request.get(`${API_BASE}/guests`, { headers: apiHeaders(accessToken) })
    ).json()) as Array<{ id: string; rsvp_status: string }>
    expect(after.find((g) => g.id === guest.id)?.rsvp_status).toBe('yes')

    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="page-dashboard"]')).toBeVisible({
      timeout: 15000,
    })
    const summary = (await getDashboardSummary(page, accessToken)) as {
      rsvp_tally: { yes: number }
    }
    await expect(page.locator('[data-mol-id="dashboard-tally-yes"]')).toContainText(
      String(summary.rsvp_tally.yes),
    )
  })

  test('a decline clears the meal choice server-side', async ({ page }) => {
    const email = uniqueEmail('rsvp-no')
    const { accessToken } = await signup(page, email)
    const wedding = await getWedding(page, accessToken)

    // Seed a guest with a meal chosen, then decline via the public page.
    const created = await page.request.post(`${API_BASE}/guests`, {
      headers: apiHeaders(accessToken),
      data: { name: `Decliner ${Date.now()}`, meal_choice: 'Whatever the kitchen suggests' },
    })
    const guest = (await created.json()) as { id: string; name: string }

    await page.goto(APP_BASE + `/rsvp/${wedding.rsvp_code}`)
    await page.locator('[data-mol-id="rsvp-name-input"]').fill(guest.name)
    await page.locator('[data-mol-id="rsvp-lookup-submit"]').click()
    await expect(page.locator('[data-mol-id="rsvp-respond"]')).toBeVisible({
      timeout: 10000,
    })
    await page.locator('[data-mol-id="rsvp-choice-no"]').click()
    await page.locator('[data-mol-id="rsvp-respond-submit"]').click()
    await expect(page.locator('[data-mol-id="rsvp-confirmed"]')).toBeVisible({
      timeout: 10000,
    })

    const after = (await (
      await page.request.get(`${API_BASE}/guests`, { headers: apiHeaders(accessToken) })
    ).json()) as Array<{ id: string; rsvp_status: string; meal_choice: string | null }>
    const row = after.find((g) => g.id === guest.id)
    expect(row?.rsvp_status).toBe('no')
    expect(row?.meal_choice).toBeNull()
  })
})
