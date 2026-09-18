import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  getFirstRepositorySlug,
  getRepository,
  signup,
  whereUrl,
} from './_helpers.js'

test.describe('/repositories/:slug', () => {
  test('renders heading + back link + Overview tab by default', async ({ page }) => {
    await signup(page)
    const slug = await getFirstRepositorySlug(page)
    await page.goto(APP_BASE + '/repositories/' + slug)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /All repositories/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Overview$/i })).toBeVisible()
  })

  test('back link returns to /repositories', async ({ page }) => {
    await signup(page)
    const slug = await getFirstRepositorySlug(page)
    await page.goto(APP_BASE + '/repositories/' + slug)
    await page.getByRole('link', { name: /All repositories/i }).click()
    await expect(page).toHaveURL(/\/repositories(?:#top)?$/)
  })

  test('Overview tab shows .conduit.yml + KPI sidebar', async ({ page }) => {
    await signup(page)
    const slug = await getFirstRepositorySlug(page)
    await page.goto(APP_BASE + '/repositories/' + slug)
    await expect(page.getByRole('heading', { name: /\.conduit\.yml/ })).toBeVisible()
    await expect(page.getByText(/Total builds/i)).toBeVisible()
    await expect(page.getByText(/Success rate/i)).toBeVisible()
    await expect(page.getByText(/Mean duration/i)).toBeVisible()
  })

  test('Branches tab shows branch list', async ({ page }) => {
    const user = await signup(page)
    const slug = await getFirstRepositorySlug(page)
    // Read the branch names from the same endpoint the page reads — the demo
    // repositories carry their own branch lists and get replaced.
    const repo = await getRepository(page, user.accessToken!, slug)
    const branches = repo.branches ?? []
    expect(branches.length, 'repository exposes branches').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/repositories/' + slug)
    await page.getByRole('button', { name: /^Branches$/i }).click()
    // Branches render as <li> with branch name in <p>, no role=listitem on parent
    await expect(page.locator('main ul li').first()).toBeVisible()
    for (const branch of branches) {
      await expect(
        page.locator('main ul li').filter({ hasText: branch.name }).first(),
      ).toBeVisible()
    }
  })

  test('Pipelines tab renders recent pipelines for repo (links go to /pipelines/:id)', async ({
    page,
  }) => {
    await signup(page)
    const slug = await getFirstRepositorySlug(page)
    await page.goto(APP_BASE + '/repositories/' + slug)
    await page.locator('main nav button:has-text("Pipelines")').click()
    await page.waitForTimeout(300)
    // After switching tab, the page renders <ul><li><a href="/pipelines/:id">…</a>
    await expect(page.locator('main ul li a[href^="/pipelines/"]').first()).toBeVisible()
  })

  test('Settings tab shows webhooks section for the repo', async ({ page }) => {
    await signup(page)
    const slug = await getFirstRepositorySlug(page)
    await page.goto(APP_BASE + '/repositories/' + slug)
    await page.locator('main nav button:has-text("Settings")').click()
    await page.waitForTimeout(300)
    await expect(page.getByRole('heading', { name: /^Webhooks$/i, level: 2 })).toBeVisible()
  })

  test('GET /api/repositories/:slug fires on page load', async ({ page }) => {
    await signup(page)
    const slug = await getFirstRepositorySlug(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/repositories/' + slug)
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const get = whereUrl(reqs, new RegExp(`/api/repositories/${slug}`), 'GET')
    expect(get.length, 'GET /api/repositories/:slug fired').toBeGreaterThan(0)
    expect(get[0].status).toBe(200)
  })

  test('reload preserves repo name (state survives reload)', async ({ page }) => {
    await signup(page)
    const slug = await getFirstRepositorySlug(page)
    await page.goto(APP_BASE + '/repositories/' + slug)
    const before = await page.getByRole('heading', { level: 1 }).textContent()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(before!)
  })

  test('description text is present', async ({ page }) => {
    await signup(page)
    const slug = await getFirstRepositorySlug(page)
    await page.goto(APP_BASE + '/repositories/' + slug)
    // h1 sibling p (description) should have non-empty text
    const desc = page.locator('h1 + p').first()
    await expect(desc).toBeVisible()
    const text = (await desc.textContent()) || ''
    expect(text.length).toBeGreaterThan(5)
  })
})
