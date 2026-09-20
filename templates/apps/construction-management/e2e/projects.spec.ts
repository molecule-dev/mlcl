import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { listProjects, signup, waitForSeed } from './_helpers.js'

test('projects page lists the seeded jobsites', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  await page.goto('/projects')

  const projects = await listProjects(page, accessToken)
  await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible()
  for (const p of projects) {
    // Each seeded project appears as a card linking to its detail page.
    const card = page.locator(`[data-mol-id="project-card-${p.id}"]`)
    await expect(card).toBeVisible()
    await expect(card.getByRole('heading', { name: p.name })).toBeVisible()
  }
})

test('creating a project through the form adds it to the list', async ({ page }) => {
  const { accessToken } = await signup(page)
  await waitForSeed(page, accessToken)
  await page.goto('/projects')

  const before = (await listProjects(page, accessToken)).length
  await page.locator('[data-mol-id="projects-new-button"]').click()
  await page.locator('[data-mol-id="projects-field-name"]').fill('E2E Test Tower')
  await page.locator('[data-mol-id="projects-field-code"]').fill('E2E-001')
  await page.locator('[data-mol-id="projects-field-budget"]').fill('1500000')
  await page.locator('[data-mol-id="projects-create-submit"]').click()

  const after = await listProjects(page, accessToken)
  expect(after.length).toBe(before + 1)
  const created = after.find((p) => p.code === 'E2E-001')
  expect(created).toBeDefined()
  await expect(page.locator(`[data-mol-id="project-card-${created?.id}"]`)).toBeVisible()
})
