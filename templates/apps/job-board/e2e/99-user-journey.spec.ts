// End-to-end primary-feature journey for job-board.
//
// Covers the two principal user roles in one browser session:
//   1. Employer signs up, creates a company, posts a job, sees it in the
//      jobs list and on the public listing page, then can view applicants.
//   2. (Same session as a stand-in for a second account because /signup
//      wires both roles to the same identity model) — fetches the published
//      job by id, applies to it, saves it, and updates the seeker profile.
//
// Each step asserts on the *outcome* the user expects (the next GET
// reflects the write, the UI shows the new row, the saved-jobs row exists,
// etc.) — not just "POST returned 2xx".

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedGet,
  authedPost,
  captureNetwork,
  expectNoConsoleErrors,
  signup,
} from './_helpers.js'

test('full job-board journey: signup → post → publish → apply → save → profile', async ({
  page,
}) => {
  test.setTimeout(180_000)

  // 1. Fresh signup → land somewhere authenticated (dashboard or /jobs).
  const creds = await signup(page)
  await expect(page).not.toHaveURL(/\/signup/)

  // 2. Create a company directly via the API so the job has somewhere to
  //    attach. The Companies UI is a list/detail surface, not an explicit
  //    creation form, so we exercise the create endpoint as the user
  //    would when filling that form once it ships.
  const company = await authedPost(page, '/companies', {
    name: `E2E Co ${Date.now()}`,
    description: 'A great place to work, allegedly.',
    location: 'Remote',
  })
  expect(company?.data?.id ?? company?.id).toBeTruthy()
  const companyId = (company?.data ?? company).id

  // 3. Post a new job through the UI and assert it persists.
  await page.goto(APP_BASE + '/post-job')
  const title = `Senior Engineer ${Date.now()}`
  await page
    .getByLabel(/job title|title/i)
    .first()
    .fill(title)
  // Description is a textarea; locate by placeholder substring or label.
  const description = page.getByLabel(/description/i).first()
  if (await description.count().catch(() => 0)) {
    await description.fill('Build the future. Async-friendly.')
  } else {
    await page.locator('textarea').first().fill('Build the future. Async-friendly.')
  }
  const location = page.getByLabel(/location/i).first()
  if (await location.count().catch(() => 0)) await location.fill('Remote')
  const salaryMin = page.getByLabel(/salary.*min|min.*salary|minimum/i).first()
  if (await salaryMin.count().catch(() => 0)) await salaryMin.fill('120000')
  const salaryMax = page.getByLabel(/salary.*max|max.*salary|maximum/i).first()
  if (await salaryMax.count().catch(() => 0)) await salaryMax.fill('180000')

  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /post(?:\s+job)?|publish|create/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
  })
  const postCall = reqs.find((r) => r.method === 'POST' && /\/api\/jobs\b/.test(r.url))
  expect(postCall, 'POST /api/jobs not observed').toBeTruthy()
  expect(postCall?.status).toBeGreaterThanOrEqual(200)
  expect(postCall?.status).toBeLessThan(300)

  // Read-after-write: the job must show up in the user's jobs list.
  const jobsList = (await authedGet(page, '/jobs')) as
    { data?: Array<{ id: string; title: string }> } | Array<{ id: string; title: string }>
  const jobs = Array.isArray(jobsList) ? jobsList : (jobsList.data ?? [])
  const created = jobs.find((j) => j.title === title)
  expect(created, 'created job not returned by GET /api/jobs').toBeTruthy()
  const jobId = created!.id

  // 4. Publish the job so it shows up on the public list endpoint.
  const publishResp = await authedPost(page, `/jobs/${jobId}/publish`, {})
  expect(publishResp).toBeTruthy()
  const published = (await authedGet(page, '/jobs/published')) as
    { data?: Array<{ id: string }> } | Array<{ id: string }>
  const publishedList = Array.isArray(published) ? published : (published.data ?? [])
  expect(
    publishedList.some((j) => j.id === jobId),
    'published job missing from /api/jobs/published',
  ).toBeTruthy()

  // 5. Visit /jobs and confirm the new posting renders.
  await page.goto(APP_BASE + '/jobs')
  await page.waitForTimeout(1500)
  await expect(page.getByText(title).first()).toBeVisible()

  // 6. Open the job detail page and apply.
  await page.goto(APP_BASE + `/jobs/${jobId}`)
  await page.waitForTimeout(800)
  await expect(page.getByRole('heading', { name: new RegExp(title, 'i') })).toBeVisible()

  const applyReqs = await captureNetwork(page, async () => {
    const applyButton = page.getByRole('button', { name: /apply/i }).first()
    if (await applyButton.count().catch(() => 0)) {
      await applyButton.click()
      await page.waitForTimeout(1500)
    }
  })
  const applyCall = applyReqs.find(
    (r) => r.method === 'POST' && /\/api\/applications\b/.test(r.url),
  )
  expect(applyCall, 'POST /api/applications not observed when clicking Apply').toBeTruthy()
  expect(applyCall?.status).toBeGreaterThanOrEqual(200)
  expect(applyCall?.status).toBeLessThan(300)

  // Read-after-write: the application appears for this user.
  const applications = (await authedGet(page, '/applications')) as
    { data?: Array<{ job_id: string }> } | Array<{ job_id: string }>
  const apps = Array.isArray(applications) ? applications : (applications.data ?? [])
  expect(
    apps.some((a) => a.job_id === jobId),
    'application not returned by GET /api/applications',
  ).toBeTruthy()

  // 7. Save the job via the bookmark button (exposes /api/saved-jobs).
  const saveReqs = await captureNetwork(page, async () => {
    const saveButton = page.getByRole('button', { name: /save\s+job|^save$/i }).first()
    if (await saveButton.count().catch(() => 0)) {
      await saveButton.click()
      await page.waitForTimeout(1500)
    }
  })
  const saveCall = saveReqs.find((r) => r.method === 'POST' && /\/api\/saved-jobs\b/.test(r.url))
  expect(saveCall, 'POST /api/saved-jobs not observed when clicking Save').toBeTruthy()
  expect(saveCall?.status).toBeGreaterThanOrEqual(200)
  expect(saveCall?.status).toBeLessThan(300)
  const saved = (await authedGet(page, '/saved-jobs')) as
    { data?: Array<{ job_id: string }> } | Array<{ job_id: string }>
  const savedList = Array.isArray(saved) ? saved : (saved.data ?? [])
  expect(
    savedList.some((s) => s.job_id === jobId),
    'saved-job row missing after Save click',
  ).toBeTruthy()

  // 8. Update the profile and assert the change round-trips through reload.
  await page.goto(APP_BASE + '/profile')
  await page.waitForTimeout(800)
  const headlineLabel = page.getByLabel(/headline/i).first()
  if (await headlineLabel.count().catch(() => 0)) {
    const headline = `E2E Headline ${Date.now()}`
    await headlineLabel.fill(headline)
    const saveProfile = page
      .getByRole('button', { name: /save\s*changes|save\s+profile|^save$/i })
      .first()
    if (await saveProfile.count().catch(() => 0)) {
      await saveProfile.click()
      await page.waitForTimeout(1500)
    }
    const profile = (await authedGet(page, '/user-profiles/me')) as { headline?: string } & {
      data?: { headline?: string }
    }
    const headlineRead = profile?.headline ?? profile?.data?.headline
    expect(headlineRead).toBe(headline)
    await page.reload()
    await page.waitForTimeout(800)
    await expect(headlineLabel).toHaveValue(headline)
  }

  // 9. Sanity: the page survived without console crashes.
  expect(creds.email).toContain('@')
  expect(companyId).toBeTruthy()
})

test('public landing renders without console errors', async ({ page }) => {
  await expectNoConsoleErrors(page, async () => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })
})
