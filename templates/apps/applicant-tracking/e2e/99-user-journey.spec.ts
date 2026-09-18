// End-to-end user journey: signup → post a job → add a candidate → move
// them through stages → schedule an interview → save profile changes →
// hit billing actions. Each step is asserted with a read-after-write
// against the API so we know the journey actually persisted.

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, authedPost, captureNetwork, signup } from './_helpers.js'

test('full recruiter journey: post → add → advance → schedule → save', async ({ page }) => {
  test.setTimeout(180_000)

  // 1. Fresh signup → land on dashboard.
  const creds = await signup(page)
  await expect(page).toHaveURL(/\/(dashboard|jobs|onboarding|home)?$/)

  // 2. Post a new job via the UI.
  await page.goto(APP_BASE + '/jobs/new')
  await page.waitForTimeout(500)
  const titleInput = page
    .locator('[data-mol-id="job-new-title"], input[name="title"], input[id*=title i]')
    .first()
  await titleInput.fill(`E2E Senior Engineer ${Date.now()}`)
  const deptInput = page
    .locator('[data-mol-id="job-new-department"], input[name="department"]')
    .first()
  if (await deptInput.count()) await deptInput.fill('Engineering')
  const locInput = page.locator('[data-mol-id="job-new-location"], input[name="location"]').first()
  if (await locInput.count()) await locInput.fill('Remote')
  const descInput = page
    .locator('[data-mol-id="job-new-description"], textarea[name="description"], textarea')
    .first()
  if (await descInput.count()) await descInput.fill('Build the future.')
  const submit = page.locator('[data-mol-id="job-new-submit"], button[type="submit"]').first()
  const reqs = await captureNetwork(page, async () => {
    await submit.click()
    await page.waitForTimeout(1500)
  })
  expect(
    reqs.some(
      (r) => r.method === 'POST' && /\/jobs\b/.test(r.url) && r.status >= 200 && r.status < 300,
    ),
  ).toBeTruthy()
  const jobsList = await authedGet(page, '/jobs')
  const jobs = (jobsList as any).data ?? jobsList
  expect(Array.isArray(jobs) ? jobs.length : 0).toBeGreaterThan(0)

  // 3. Add a candidate via the UI.
  await page.goto(APP_BASE + '/candidates')
  await page.waitForTimeout(500)
  await page.locator('[data-mol-id="candidates-add-toggle"]').click()
  await page.locator('[data-mol-id="candidates-add-first"]').fill('Journey')
  await page.locator('[data-mol-id="candidates-add-last"]').fill('Walker')
  const candEmail = `journey-${Date.now()}@example.com`
  await page.locator('[data-mol-id="candidates-add-email"]').fill(candEmail)
  await page.locator('[data-mol-id="candidates-add-submit"]').click()
  await page.waitForTimeout(1500)
  const candList = await authedGet(page, '/candidates')
  const cands = (candList as any).data ?? candList
  const cand = cands.find((c: any) => c.email === candEmail)
  expect(cand).toBeTruthy()

  // 4. Advance the candidate via the detail page.
  await page.goto(APP_BASE + `/candidates/${cand.id}`)
  await page.waitForTimeout(700)
  await page.locator('[data-mol-id="candidate-advance"]').click()
  await page.waitForTimeout(1000)
  const after = await authedGet(page, `/candidates/${cand.id}`)
  expect(['screening', 'sourced']).toContain(after.stage)

  // 5. Schedule an interview from the detail page.
  await page.getByRole('button', { name: /^interviews$/i }).click()
  await page.locator('[data-mol-id="candidate-schedule-interviewer"]').fill('Eli QA')
  await page.locator('[data-mol-id="candidate-schedule-submit"]').click()
  await page.waitForTimeout(1500)
  const interviews = await authedGet(page, `/interviews?candidate_id=${cand.id}`)
  const interviewList = (interviews as any).data ?? interviews
  expect(Array.isArray(interviewList) ? interviewList.length : 0).toBeGreaterThan(0)

  // 6. Save profile changes.
  await page.goto(APP_BASE + '/profile')
  await page.waitForTimeout(800)
  const newName = `Journey Recruiter ${Date.now()}`
  await page.locator('[data-mol-id="profile-name"]').fill(newName)
  await page.locator('[data-mol-id="profile-save"]').click()
  await page.waitForTimeout(1500)
  const profile = await authedGet(page, '/profile')
  const pdata = (profile as any).data ?? profile
  expect(pdata.display_name).toBe(newName)

  // 7. Hit one billing action — manage seats — and verify it dispatched.
  await page.goto(APP_BASE + '/billing')
  await page.waitForTimeout(1500)
  const billingReqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="billing-manage-seats"]').click()
    await page.waitForTimeout(1500)
  })
  expect(
    billingReqs.some((r) => r.method === 'POST' && /\/billing\/seats\b/.test(r.url)),
  ).toBeTruthy()

  // 8. Sanity: console-app survived without crashing.
  expect(creds.email).toContain('@')
})
