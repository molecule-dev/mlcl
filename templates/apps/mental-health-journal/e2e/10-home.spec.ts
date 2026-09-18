import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/home', () => {
  test('renders greeting heading', async ({ page }) => {
    await signup(page)
    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 })
    await expect(
      page.getByRole('heading', { level: 1, name: /Good to see you|Welcome back/i }),
    ).toBeVisible()
  })

  test('primary navigation has all expected links', async ({ page }) => {
    await signup(page)
    const nav = page.getByRole('navigation', { name: /Primary navigation/i })
    await expect(nav).toBeVisible()
    for (const name of [
      /^Today$/,
      /^Journal$/,
      /^Insights$/,
      /^Calendar$/,
      /^Prompts$/,
      /^Profile$/,
      /^Settings$/,
    ]) {
      await expect(nav.getByRole('link', { name })).toBeVisible()
    }
  })

  test('"Journal" nav link goes to /journal', async ({ page }) => {
    await signup(page)
    await page
      .getByRole('navigation', { name: /Primary navigation/i })
      .getByRole('link', { name: /^Journal$/ })
      .click()
    await expect(page).toHaveURL(/\/journal$/, { timeout: 10_000 })
  })

  test('"Insights" nav link goes to /insights', async ({ page }) => {
    await signup(page)
    await page
      .getByRole('navigation', { name: /Primary navigation/i })
      .getByRole('link', { name: /^Insights$/ })
      .click()
    await expect(page).toHaveURL(/\/insights$/, { timeout: 10_000 })
  })

  test('"Calendar" nav link goes to /calendar', async ({ page }) => {
    await signup(page)
    await page
      .getByRole('navigation', { name: /Primary navigation/i })
      .getByRole('link', { name: /^Calendar$/ })
      .click()
    await expect(page).toHaveURL(/\/calendar$/, { timeout: 10_000 })
  })

  test('"Prompts" nav link goes to /prompts', async ({ page }) => {
    await signup(page)
    await page
      .getByRole('navigation', { name: /Primary navigation/i })
      .getByRole('link', { name: /^Prompts$/ })
      .click()
    await expect(page).toHaveURL(/\/prompts$/, { timeout: 10_000 })
  })

  test('"Profile" nav link goes to /profile', async ({ page }) => {
    await signup(page)
    await page
      .getByRole('navigation', { name: /Primary navigation/i })
      .getByRole('link', { name: /^Profile$/ })
      .click()
    await expect(page).toHaveURL(/\/profile$/, { timeout: 10_000 })
  })

  test('"Settings" nav link goes to /settings', async ({ page }) => {
    await signup(page)
    await page
      .getByRole('navigation', { name: /Primary navigation/i })
      .getByRole('link', { name: /^Settings$/ })
      .click()
    await expect(page).toHaveURL(/\/settings$/, { timeout: 10_000 })
  })

  test('"New entry" CTA goes to /journal/new', async ({ page }) => {
    await signup(page)
    await expect(page).toHaveURL(/\/home/)
    const cta = page.getByRole('link', { name: /New entry/i }).first()
    await expect(cta).toBeVisible()
    expect(await cta.getAttribute('href')).toBe('/journal/new')
  })

  test('fresh user sees empty-state copy and not demo entries', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
      // /home is reached during signup; wait for empty-state to render
      await expect(page.getByText(/No reflections yet/i)).toBeVisible({ timeout: 15_000 })
    })
    // No demo-* entry titles leak into the page
    await expect(page.getByText(/A quiet morning walk/)).toHaveCount(0)
    // The recent endpoint was called and returned 2xx
    const recent = reqs.find((r) => r.url.includes('/api/journal/recent'))
    expect(recent, '/api/journal/recent observed').toBeDefined()
    expect(recent!.status).toBeLessThan(300)
  })
})
