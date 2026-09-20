import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { listProjects, signup, waitForSeed } from './_helpers.js'

test('dashboard shows seeded projects and RFI aging panels', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /open rfi aging/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /open punch items by severity/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /recent daily logs/i })).toBeVisible()

  // The KPI cards render counts — at least the projects KPI is non-zero.
  const projects = await listProjects(page, accessToken)
  expect(projects.length).toBeGreaterThan(0)
  const kpi = page.locator('[data-mol-id^="dashboard-kpi-"]').first()
  await expect(kpi).toBeVisible()
})

test('dashboard links to the projects list', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  await page.goto('/dashboard')
  await page.locator('[data-mol-id="dashboard-all-projects"]').click()
  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible()
})
