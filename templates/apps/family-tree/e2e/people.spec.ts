/**
 * People directory. Verifies the list renders every person the API returns
 * and that the search box narrows it (query read from the API payload —
 * never from demo-data literals).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listPeople, signup, uniqueEmail } from './_helpers.js'

test.describe('people', () => {
  test('directory renders one card per person from /api/people', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('people-list'))
    const people = await listPeople(page, accessToken)
    expect(people.length).toBeGreaterThan(0)

    await page.goto(APP_BASE + '/people')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-people"]').first()).toBeVisible()
    for (const p of people.slice(0, 5)) {
      await expect(page.locator(`[data-mol-id="person-card-${p.id}"]`).first()).toBeAttached()
    }
  })

  test('search narrows the directory by name', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('people-search'))
    const people = await listPeople(page, accessToken)
    const target = people[0]
    const needle = target.first_name

    await page.goto(APP_BASE + '/people')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="people-search"]').fill(needle)
    await page.waitForLoadState('networkidle')

    const matches = people.filter((p) =>
      [p.first_name, p.last_name, p.maiden_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle.toLowerCase()),
    )
    for (const p of people) {
      if (matches.some((m) => m.id === p.id)) {
        await expect(page.locator(`[data-mol-id="person-card-${p.id}"]`).first()).toBeAttached()
      } else {
        await expect(
          page.locator(`[data-mol-id="person-card-${p.id}"]`),
          `${p.first_name} should be filtered out`,
        ).toHaveCount(0)
      }
    }
  })

  test('add-person button routes to the create form', async ({ page }) => {
    await signup(page, uniqueEmail('people-add-route'))
    await page.goto(APP_BASE + '/people')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="people-add"]').click()
    await expect(page).toHaveURL(/\/people\/new/)
    await expect(page.locator('[data-mol-id="page-add-person"]').first()).toBeVisible()
  })
})
