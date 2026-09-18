import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedGet,
  authedPost,
  captureNetwork,
  expectNoConsoleErrors,
  signup,
} from './_helpers.js'

async function seedCandidate(page: any) {
  await signup(page)
  return authedPost(page, '/candidates', {
    first_name: 'Sam',
    last_name: 'Detail',
    email: `sam-${Date.now()}@example.com`,
    source: 'LinkedIn',
  })
}

test.describe('candidate detail page', () => {
  test('loads candidate by id and shows the name', async ({ page }) => {
    const cand = await seedCandidate(page)
    await page.goto(APP_BASE + `/candidates/${cand.id}`)
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading', { name: /Sam Detail/i }).first()).toBeVisible()
  })

  test('GET /api/candidates/:id is hit on load', async ({ page }) => {
    const cand = await seedCandidate(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/candidates/${cand.id}`)
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some(
        (r) =>
          r.method === 'GET' &&
          new RegExp(`/candidates/${cand.id}\\b`).test(r.url) &&
          r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('Move-to-stage button persists and is reflected by GET', async ({ page }) => {
    const cand = await seedCandidate(page)
    await page.goto(APP_BASE + `/candidates/${cand.id}`)
    await page.waitForTimeout(800)
    const requests = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="candidate-move-interview"]').click()
      await page.waitForTimeout(1200)
    })
    expect(
      requests.some(
        (r) =>
          r.method === 'PUT' &&
          new RegExp(`/candidates/${cand.id}\\b`).test(r.url) &&
          r.status === 200,
      ),
    ).toBeTruthy()
    const after = await authedGet(page, `/candidates/${cand.id}`)
    expect(after.stage).toBe('interview')
  })

  test('Advance button moves stage one step forward', async ({ page }) => {
    const cand = await seedCandidate(page)
    await page.goto(APP_BASE + `/candidates/${cand.id}`)
    await page.waitForTimeout(800)
    await page.locator('[data-mol-id="candidate-advance"]').click()
    await page.waitForTimeout(1000)
    const after = await authedGet(page, `/candidates/${cand.id}`)
    expect(['screening']).toContain(after.stage)
  })

  test('Schedule-interview form persists and the interview appears in /interviews', async ({
    page,
  }) => {
    const cand = await seedCandidate(page)
    await page.goto(APP_BASE + `/candidates/${cand.id}`)
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /^interviews$/i }).click()
    await expect(page.locator('[data-mol-id="candidate-schedule-form"]')).toBeVisible()
    await page.locator('[data-mol-id="candidate-schedule-interviewer"]').fill('Eli QA')
    const requests = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="candidate-schedule-submit"]').click()
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some(
        (r) =>
          r.method === 'POST' && /\/interviews\b/.test(r.url) && r.status >= 200 && r.status < 300,
      ),
    ).toBeTruthy()
    const list = await authedGet(page, `/interviews?candidate_id=${cand.id}`)
    expect(Array.isArray(list) ? list.length : (list.data ?? []).length).toBeGreaterThan(0)
  })

  test('Back-to-candidates link routes to /candidates', async ({ page }) => {
    const cand = await seedCandidate(page)
    await page.goto(APP_BASE + `/candidates/${cand.id}`)
    await page
      .getByRole('link', { name: /all candidates/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/candidates$/)
  })

  test('renders without console errors', async ({ page }) => {
    const cand = await seedCandidate(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + `/candidates/${cand.id}`)
      await expect(page.getByRole('heading', { name: /sam detail/i }).first()).toBeVisible()
    })
  })
})
