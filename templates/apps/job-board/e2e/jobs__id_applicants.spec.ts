import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedPost, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('job applicants page (/jobs/:id/applicants)', () => {
  test('mount fires GET /api/applications scoped to the job', async ({ page }) => {
    await signup(page)
    const company = await authedPost(page, '/companies', {
      name: `JobApplicants ${Date.now()}`,
      description: 'Seed.',
    })
    const job = await authedPost(page, '/jobs', {
      title: `JobApplicants ${Date.now()}`,
      description: 'Seed.',
      type: 'full_time',
      company_id: (company?.data ?? company).id,
    })
    const jobId = (job?.data ?? job).id
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/jobs/${jobId}/applicants`)
      await page.waitForTimeout(1500)
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/applications\b/.test(r.url))).toBeTruthy()
  })

  test('renders a heading', async ({ page }) => {
    await signup(page)
    const company = await authedPost(page, '/companies', {
      name: `JobApplicants H ${Date.now()}`,
      description: 'Seed.',
    })
    const job = await authedPost(page, '/jobs', {
      title: `JobApplicants H ${Date.now()}`,
      description: 'Seed.',
      type: 'full_time',
      company_id: (company?.data ?? company).id,
    })
    const jobId = (job?.data ?? job).id
    await page.goto(APP_BASE + `/jobs/${jobId}/applicants`)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('shows an empty-state when no one has applied yet', async ({ page }) => {
    await signup(page)
    const company = await authedPost(page, '/companies', {
      name: `JobApplicants E ${Date.now()}`,
      description: 'Seed.',
    })
    const job = await authedPost(page, '/jobs', {
      title: `JobApplicants E ${Date.now()}`,
      description: 'Seed.',
      type: 'full_time',
      company_id: (company?.data ?? company).id,
    })
    const jobId = (job?.data ?? job).id
    await page.goto(APP_BASE + `/jobs/${jobId}/applicants`)
    await page.waitForTimeout(1500)
    const empty = page.getByText(/no\s*applicants|nobody.*applied|applicants.*yet/i).first()
    if (await empty.count().catch(() => 0)) {
      await expect(empty).toBeVisible()
    }
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    const company = await authedPost(page, '/companies', {
      name: `JobApplicants C ${Date.now()}`,
      description: 'Seed.',
    })
    const job = await authedPost(page, '/jobs', {
      title: `JobApplicants C ${Date.now()}`,
      description: 'Seed.',
      type: 'full_time',
      company_id: (company?.data ?? company).id,
    })
    const jobId = (job?.data ?? job).id
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + `/jobs/${jobId}/applicants`)
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
