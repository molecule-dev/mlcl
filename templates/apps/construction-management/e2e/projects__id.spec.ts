import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { listProjects, signup, waitForSeed } from './_helpers.js'

test('project detail shows overview with budget, phase, and sub-navigation', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  await page.goto(`/projects/${project.id}`)
  await expect(page.getByRole('heading', { name: project.name })).toBeVisible()
  await expect(page.getByRole('heading', { name: /vitals/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /about this project/i })).toBeVisible()

  // Sub-navigation to every project section.
  for (const key of ['logs', 'punch', 'rfis', 'subs']) {
    await expect(page.locator(`[data-mol-id="project-nav-${key}"]`)).toBeVisible()
  }
  await expect(page.locator('[data-mol-id="project-nav-overview"]')).toHaveAttribute(
    'href',
    `/projects/${project.id}`,
  )
})

test('project detail phase badge matches the API row', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  const projects = await listProjects(page, accessToken)
  const project = projects[0]!

  await page.goto(`/projects/${project.id}`)
  const badge = page.locator(`[data-mol-id="badge-${project.phase}"]`)
  await expect(badge).toBeVisible()
})
