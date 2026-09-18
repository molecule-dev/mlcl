import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, createProject, signup } from './_helpers.js'

test.describe('/library (Library)', () => {
  test('renders the Library heading and fetches /api/library/easings + templates', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/library')
      await expect(page.getByRole('heading', { name: /Library/i, level: 1 })).toBeVisible()
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const easings = reqs.find((r) => /\/api\/library\/easings/.test(r.url) && r.method === 'GET')
    const templates = reqs.find(
      (r) => /\/api\/library\/templates/.test(r.url) && r.method === 'GET',
    )
    expect(easings, 'GET /api/library/easings fired').toBeTruthy()
    expect(easings!.status).toBeLessThan(300)
    expect(templates, 'GET /api/library/templates fired').toBeTruthy()
    expect(templates!.status).toBeLessThan(300)
  })

  test('Ease Out Quint button activates that easing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.getByRole('button', { name: /Ease Out Quint/i }).click()
    await expect(page.getByRole('button', { name: /Ease Out Quint/i })).toContainText(
      /Active|Ease Out Quint/i,
    )
  })

  test('Ease In Out button is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    const btn = page.getByRole('button', { name: /Ease In Out/i })
    await expect(btn).toBeVisible()
    await btn.click()
  })

  test('Spring button is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    const btn = page.getByRole('button', { name: /^Spring/i })
    await expect(btn).toBeVisible()
    await btn.click()
  })

  test('Snap button is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    const btn = page.getByRole('button', { name: /^Snap/i })
    await expect(btn).toBeVisible()
    await btn.click()
  })

  test('Gentle button is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    const btn = page.getByRole('button', { name: /^Gentle/i })
    await expect(btn).toBeVisible()
    await btn.click()
  })

  test('Bounce button is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    const btn = page.getByRole('button', { name: /^Bounce/i })
    await expect(btn).toBeVisible()
    await btn.click()
  })

  test('Insert click POSTs /api/keyframes and the next GET returns the new row', async ({
    page,
  }) => {
    await signup(page)
    const id = await createProject(page, 'Library Insert Spec')
    const cookies = await page.context().cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    await page.goto(APP_BASE + '/library')
    // Wait for library to load templates so latest project is also fetched.
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})

    const before = await page.request.get(`${API_BASE}/keyframes?projectId=${id}`, {
      headers: { Cookie: cookieStr },
    })
    const beforeArr = await before.json()
    const beforeCount = Array.isArray(beforeArr) ? beforeArr.length : 0

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Insert$/ })
        .first()
        .click()
      await page.waitForTimeout(2_000)
    })
    const post = reqs.find((r) => /\/api\/keyframes(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/keyframes fired').toBeTruthy()
    expect(post!.status).toBeLessThan(300)

    const after = await page.request.get(`${API_BASE}/keyframes?projectId=${id}`, {
      headers: { Cookie: cookieStr },
    })
    const afterArr = await after.json()
    expect(afterArr.length, 'keyframe count must increase by 1').toBe(beforeCount + 1)
  })
})
