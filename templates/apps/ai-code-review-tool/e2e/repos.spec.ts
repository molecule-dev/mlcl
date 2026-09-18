import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Repositories page', () => {
  test('empty state when no repos exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/repos')
    await expect(page.getByText(/No repositories connected yet/i)).toBeVisible()
  })

  test('Connect repository button toggles connect form open', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/repos')
    await page.getByRole('button', { name: /connect repository/i }).click()
    await expect(page.getByLabel(/full name/i)).toBeVisible()
    await page.getByRole('button', { name: /^cancel$/i }).click()
    await expect(page.getByLabel(/full name/i)).toBeHidden()
  })

  test('connecting a repo POSTs /api/repositories and the row appears + persists across reload', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/repos')
    await page.getByRole('button', { name: /connect repository/i }).click()
    const fullName = `refract-test/repo-${Date.now()}`
    await page.getByLabel(/full name/i).fill(fullName)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /add repository/i }).click()
      await page.getByText(fullName).waitFor({ timeout: 10000 })
    })
    const postRepo = whereUrl(reqs, /\/api\/repositories(?:\?|$)/, 'POST')
    expect(postRepo.length, 'POST /api/repositories fired').toBeGreaterThan(0)
    expect(postRepo[0].status, 'create repo must succeed').toBeLessThan(400)

    // Read-after-write via direct API call
    const api = await authedApi(request, session.accessToken!)
    const list = await api.get('/repositories')
    expect(list.status()).toBe(200)
    const rows = await list.json()
    expect(
      Array.isArray(rows)
        ? rows.some((r: { full_name: string }) => r.full_name === fullName)
        : false,
    ).toBe(true)

    // Reload-persistence
    await page.reload()
    await expect(page.getByText(fullName)).toBeVisible()
  })

  test('connecting an empty name is rejected before POST', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/repos')
    await page.getByRole('button', { name: /connect repository/i }).click()
    const reqs = await captureNetwork(page, async () => {
      const submit = page.getByRole('button', { name: /add repository/i })
      // The required attribute on the input prevents submit; click does
      // nothing; capture-block is exercised even if no requests fire.
      await submit.click({ force: true }).catch(() => {})
      await page.waitForTimeout(500)
    })
    const postRepo = whereUrl(reqs, /\/api\/repositories(?:\?|$)/, 'POST')
    expect(postRepo.length, 'POST should NOT fire on empty submission').toBe(0)
  })

  test('clicking a repo card navigates to /repos/:id detail page', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const repoRes = await api.post('/repositories', {
      full_name: `refract/detail-${Date.now()}`,
      provider: 'github',
      default_branch: 'main',
    })
    const repo = await repoRes.json()
    await page.goto(APP_BASE + '/repos')
    await page.getByText(repo.full_name).first().click()
    await expect(page).toHaveURL(new RegExp(`/repos/${repo.id}`))
  })

  test('provider select can be changed before submit', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/repos')
    await page.getByRole('button', { name: /connect repository/i }).click()
    const select = page.getByLabel(/provider/i)
    await select.selectOption('gitlab')
    await expect(select).toHaveValue('gitlab')
    await select.selectOption('github')
    await expect(select).toHaveValue('github')
  })

  test('AuthGuard redirects anonymous visitors to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/repos')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('initial load fires GET /api/repositories', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/repos')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    const gets = whereUrl(reqs, /\/api\/repositories(?:\?|$)/, 'GET')
    expect(gets.length, 'expected GET /api/repositories on load').toBeGreaterThan(0)
    expect(gets[0]!.status).toBe(200)
  })
})
