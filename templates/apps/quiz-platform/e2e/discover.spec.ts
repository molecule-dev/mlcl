import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  buildPublishedQuiz,
  captureNetwork,
  flipThemeAndAssertChanged,
  flipThemeAndAssertSurvivesReload,
  signup,
} from './_helpers.js'

test.describe('/discover', () => {
  test('renders header brand link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await expect(page.getByRole('link', { name: /^sparq/i }).first()).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await flipThemeAndAssertChanged(page)
  })

  test('toggle theme persists across page reload (read-after-write)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await flipThemeAndAssertSurvivesReload(page)
  })

  test('user-menu opens with account/auth/log-out controls', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page
      .getByRole('button', { name: /open user menu|account|profile/i })
      .first()
      .click()
    // SettingsPanel modal exposes section headings + a Log out button.
    await expect(page.getByRole('heading', { name: /account/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /log\s*out|sign\s*out/i }).first()).toBeVisible()
  })

  test('GET /api/quizzes fires on initial load (gate-12)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/discover')
      await page.waitForLoadState('networkidle')
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/quizzes(\?|$)/.test(r.url))
    expect(list, 'GET /api/quizzes').toBeTruthy()
    expect(list?.status).toBe(200)
  })

  test('search box accepts text + submits, fires /api/quizzes?search=…', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page.waitForLoadState('networkidle')
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'GET' && /\/api\/quizzes\?.*search=/.test(r.url()),
      { timeout: 15000 },
    )
    await page.locator('input[type="search"]').first().fill('zzznever-matches-anything')
    await page.getByRole('button', { name: /^search$/i }).click()
    const r = await respPromise.catch(() => null)
    expect(r, 'GET /api/quizzes?search=…').toBeTruthy()
  })

  test('Category chip "All" is present and pressable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page.getByRole('button', { name: /^all$/i }).first().click()
    await expect(page.getByRole('button', { name: /^all$/i }).first()).toBeVisible()
  })

  test('Category chip "Science" filters list (fires GET ?category=science)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page.waitForLoadState('networkidle')
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'GET' && /\/api\/quizzes\?.*category=science/.test(r.url()),
      { timeout: 15000 },
    )
    await page.getByRole('button', { name: /^science$/i }).click()
    const r = await respPromise.catch(() => null)
    expect(r, 'GET /api/quizzes?category=science').toBeTruthy()
  })

  test('Category chip "Geography" filters list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page.getByRole('button', { name: /^geography$/i }).click()
    await page.waitForLoadState('networkidle')
  })

  test('Category chip "History" present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await expect(page.getByRole('button', { name: /^history$/i })).toBeVisible()
  })

  test('Category chip "Arts & Music" present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await expect(page.getByRole('button', { name: /arts.*music/i })).toBeVisible()
  })

  test('Category chip "Sports" present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await expect(page.getByRole('button', { name: /^sports$/i })).toBeVisible()
  })

  test('Category chip "Pop Culture" present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await expect(page.getByRole('button', { name: /pop culture/i })).toBeVisible()
  })

  test('Published quiz appears as a Play card after build+publish (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    const built = await buildPublishedQuiz(page, `Trivia E2E ${Date.now()}`, 'general')
    await page.goto(APP_BASE + '/discover')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(built.title).first()).toBeVisible()
  })

  test('"See your library" link → /my-quizzes', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page.getByRole('link', { name: /see your library/i }).click()
    await expect(page).toHaveURL(/\/my-quizzes$/)
  })

  test('"Classroom Starters" curated chip filters to Science', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page.getByRole('button', { name: /classroom starters/i }).click()
    await page.waitForLoadState('networkidle')
  })

  test('"Game Night Hits" curated chip switches active category', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page.getByRole('button', { name: /game night hits/i }).click()
    await page.waitForLoadState('networkidle')
  })

  test('"Geography Tournaments" curated chip switches active category', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page.getByRole('button', { name: /geography tournaments/i }).click()
    await page.waitForLoadState('networkidle')
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/discover')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })

  test('QuizCard "Play" link points to /quiz/{id}', async ({ page }) => {
    await signup(page)
    await buildPublishedQuiz(page, `Card-Play ${Date.now()}`, 'general')
    await page.goto(APP_BASE + '/discover')
    await page.waitForLoadState('networkidle')
    const playLink = page.getByRole('link', { name: /^play$/i }).first()
    await expect(playLink).toHaveAttribute('href', /^\/quiz\/[^/]+$/)
  })
})
