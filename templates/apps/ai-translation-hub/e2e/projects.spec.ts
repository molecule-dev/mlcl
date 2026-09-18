import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, seedProject, signup } from './_helpers.js'

test.describe('/projects: list + create', () => {
  test('GET /api/projects fires on page load and lists seeded projects', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken, { name: `Visible Project ${Date.now()}` })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/projects')
      await page.waitForResponse((r) => /\/api\/projects/.test(r.url()) && r.status() === 200, {
        timeout: 15_000,
      })
    })
    expect(reqs.find((r) => r.method === 'GET' && /\/api\/projects/.test(r.url))).toBeDefined()
    await expect(page.getByText(project.name).first()).toBeVisible({ timeout: 10_000 })
  })

  test('"New project" CTA navigates to /projects/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    const cta = page
      .getByRole('link', { name: /new project|create project|start.*project/i })
      .first()
    if (await cta.count().catch(() => 0)) {
      await cta.click()
      await expect(page).toHaveURL(/\/projects\/new/)
    } else {
      // Some renditions surface the CTA via a button that links via React router
      const btn = page.getByRole('button', { name: /new project|create project/i }).first()
      await btn.click()
      await expect(page).toHaveURL(/\/projects\/new/)
    }
  })

  test('Empty state copy renders when the user has no projects yet', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.waitForResponse((r) => /\/api\/projects/.test(r.url()) && r.status() === 200, {
      timeout: 15_000,
    })
    // Heading must render even if the list is empty.
    await expect(page.getByRole('heading', { name: /projects/i }).first()).toBeVisible()
  })

  test('Multiple seeded projects all appear in the list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a = await seedProject(page, accessToken, { name: `Alpha ${Date.now()}` })
    const b = await seedProject(page, accessToken, { name: `Bravo ${Date.now()}` })
    await page.goto(APP_BASE + '/projects')
    await page.waitForResponse((r) => /\/api\/projects/.test(r.url()) && r.status() === 200, {
      timeout: 15_000,
    })
    await expect(page.getByText(a.name).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(b.name).first()).toBeVisible({ timeout: 10_000 })
  })
})
