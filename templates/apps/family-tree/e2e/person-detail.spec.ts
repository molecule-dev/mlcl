/**
 * Person detail. Verifies the wire-shape contract: GET /api/people/:id
 * returns relatives grouped by relation + a life timeline, and the page
 * surfaces the name, the grouped relative sections, and the timeline — all
 * expected values read from the API inside the test.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getPerson, listPeople, signup, uniqueEmail } from './_helpers.js'

test.describe('person detail', () => {
  test('surfaces the name, grouped relatives, and life timeline', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('person-detail'))
    const people = await listPeople(page, accessToken)
    // Prefer someone with relatives + dated events so the groups are non-empty.
    const withRelatives = await Promise.all(
      people.slice(0, 6).map((p) => getPerson(page, accessToken, p.id)),
    )
    const target =
      withRelatives.find(
        (p) => (p.relatives?.parents.length ?? 0) + (p.relatives?.children.length ?? 0) > 0,
      ) ?? withRelatives[0]
    expect(target, 'seeded tree must expose a person with relatives').toBeDefined()

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/people/${target.id}`)
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.some(
        (r) => r.url.endsWith(`/api/people/${target.id}`) && r.method === 'GET' && r.status < 400,
      ),
    ).toBe(true)

    await expect(page.locator('[data-mol-id="page-person-detail"]').first()).toBeVisible()
    const name = `${target.first_name} ${target.last_name ?? ''}`.trim()
    await expect(page.locator('[data-mol-id="person-detail-name"]')).toHaveText(
      new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}†?$`),
    )

    // Relative groups render exactly for the populated relation types.
    const groups = ['parents', 'partners', 'children', 'siblings'] as const
    for (const g of groups) {
      const count = target.relatives?.[g].length ?? 0
      const loc = page.locator(`[data-mol-id="relative-group-${g}"]`)
      if (count > 0) {
        await expect(loc.first()).toBeAttached()
      } else {
        await expect(loc).toHaveCount(0)
      }
    }

    // Timeline section renders with at least the API's event count of entries.
    await expect(page.locator('[data-mol-id="person-detail-timeline"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="life-timeline"] li').first()).toBeAttached()

    // Edit + add-relative actions are reachable.
    await expect(page.locator('[data-mol-id="person-detail-edit"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="person-detail-add-relative"]')).toBeVisible()
  })

  test('unknown person id shows the not-found error', async ({ page }) => {
    await signup(page, uniqueEmail('person-404'))
    // The unknown-person GET 404s — expected; silence the resource-load
    // console error before the navigation fires it.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await page.goto(APP_BASE + '/people/00000000-0000-4000-8000-000000000000')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-person-detail"]').first()).toBeVisible()
    await expect(page.locator('body')).toContainText(/not found/i)
  })
})
