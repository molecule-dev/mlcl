import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedKeyResult, seedObjective, signup } from './_helpers.js'

test.describe('Objective detail /objectives/:id', () => {
  test('renders the objective title', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Detail title smoke' })
    await page.goto(APP_BASE + `/objectives/${obj.id}`)
    await expect(page.getByRole('heading', { name: /detail title smoke/i })).toBeVisible()
  })

  test('initial load calls /api/objectives/:id and /api/check-ins?objective_id=:id', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Detail network smoke' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/objectives/${obj.id}`)
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const oneObj = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/objectives/${obj.id}(\\?|$)`).test(r.url),
    )
    expect(oneObj, 'expected GET /api/objectives/<id>').toBeTruthy()
    expect(oneObj!.status).toBe(200)
    // The detail page embeds key-results in the objective response, so it
    // does NOT call /api/key-results separately. Check-ins are fetched
    // scoped to this objective.
    const cis = reqs.find(
      (r) =>
        r.method === 'GET' && new RegExp(`/api/check-ins\\?objective_id=${obj.id}`).test(r.url),
    )
    expect(cis, 'expected GET /api/check-ins?objective_id=<id>').toBeTruthy()
    expect(cis!.status).toBe(200)
  })

  test('shows objective-no-krs empty state when no key-results exist', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Bare detail' })
    await page.goto(APP_BASE + `/objectives/${obj.id}`)
    await expect(page.getByTestId('objective-no-krs')).toBeVisible()
  })

  test('shows the seeded KR title once a key-result is added', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'KR detail seed' })
    await seedKeyResult(page, accessToken!, {
      objective_id: obj.id,
      title: 'Detail KR readback',
      metric_type: 'number',
      start_value: 0,
      target_value: 10,
    })
    await page.goto(APP_BASE + `/objectives/${obj.id}`)
    await expect(page.locator('main')).toContainText('Detail KR readback')
    await expect(page.getByTestId('objective-no-krs')).toHaveCount(0)
  })

  test('Edit objective link routes to the edit page', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Edit-route' })
    await page.goto(APP_BASE + `/objectives/${obj.id}`)
    await page.getByRole('link', { name: /edit objective/i }).click()
    await expect(page).toHaveURL(new RegExp(`/objectives/${obj.id}/edit$`))
  })

  test('Run check-in link routes to /check-in', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Run-checkin' })
    await page.goto(APP_BASE + `/objectives/${obj.id}`)
    await page.getByRole('link', { name: /run check-in/i }).click()
    await expect(page).toHaveURL(/\/check-in$/)
  })

  test('Objectives breadcrumb routes back to /objectives', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Crumb-back' })
    await page.goto(APP_BASE + `/objectives/${obj.id}`)
    await page
      .getByRole('link', { name: /^objectives$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/objectives$/)
  })

  test('Heading "Key results" section visible', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Sections-A' })
    await page.goto(APP_BASE + `/objectives/${obj.id}`)
    await expect(page.getByRole('heading', { name: /^key results$/i })).toBeVisible()
  })

  test('Heading "Check-in timeline" section visible', async ({ page }) => {
    const { accessToken } = await signup(page)
    const obj = await seedObjective(page, accessToken!, { title: 'Sections-B' })
    await page.goto(APP_BASE + `/objectives/${obj.id}`)
    await expect(page.getByRole('heading', { name: /check-in timeline/i })).toBeVisible()
  })
})
