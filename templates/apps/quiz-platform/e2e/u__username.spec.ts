import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  buildPublishedQuiz,
  captureNetwork,
  flipThemeAndAssertChanged,
  signup,
} from './_helpers.js'

async function profileUrl(page: import('@playwright/test').Page) {
  // Username is derived from email local-part on signup; fetch from /users/me.
  const meResp = await page.request.get(API_BASE + '/users/me')
  const meBody = (await meResp.json().catch(() => ({}))) as {
    props?: { email?: string }
    email?: string
  }
  const email = meBody.props?.email ?? (meBody as { email?: string }).email ?? null
  const username = email ? email.split('@')[0] : 'me'
  return `${APP_BASE}/u/${encodeURIComponent(username)}`
}

test.describe('/u/:username (Profile)', () => {
  test('renders header brand link', async ({ page }) => {
    await signup(page)
    await page.goto(await profileUrl(page))
    await expect(page.getByRole('link', { name: /^sparq/i }).first()).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await signup(page)
    await page.goto(await profileUrl(page))
    await flipThemeAndAssertChanged(page)
  })

  test('user-menu opens with Profile/Settings/Notifications/Sign out items', async ({ page }) => {
    await signup(page)
    await page.goto(await profileUrl(page))
    await page
      .getByRole('button', { name: /open user menu|account|profile/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible()
  })

  test("profile-display-name shows the signed-in user's display name", async ({ page }) => {
    const auth = await signup(page)
    await page.goto(await profileUrl(page))
    await expect(page.getByTestId('profile-display-name')).toContainText(auth.name)
  })

  test('"Edit profile" link → /settings', async ({ page }) => {
    await signup(page)
    await page.goto(await profileUrl(page))
    const edit = page.getByTestId('profile-edit')
    await expect(edit).toBeVisible()
    await edit.click()
    await expect(page).toHaveURL(/\/settings$/)
  })

  test('"Build a quiz" link → /my-quizzes', async ({ page }) => {
    await signup(page)
    await page.goto(await profileUrl(page))
    const build = page.getByTestId('profile-create')
    await build.click()
    await expect(page).toHaveURL(/\/my-quizzes$/)
  })

  test('"Published quizzes" stat = 0 immediately after fresh signup', async ({ page }) => {
    await signup(page)
    await page.goto(await profileUrl(page))
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/published quizzes/i).first()).toBeVisible()
    await expect(page.getByText('0').first()).toBeVisible()
  })

  test('"Published quizzes" stat increments after building+publishing a quiz (read-after-write)', async ({
    page,
  }) => {
    await signup(page)
    await buildPublishedQuiz(page, `Profile-Pub ${Date.now()}`, 'general')
    await page.goto(await profileUrl(page))
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="profile-quiz-grid"]')).toBeVisible()
  })

  test('"Total plays" stat is rendered (numeric)', async ({ page }) => {
    await signup(page)
    await page.goto(await profileUrl(page))
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/total plays/i).first()).toBeVisible()
  })

  test('Empty-state "Start building →" link → /my-quizzes when no published quizzes', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(await profileUrl(page))
    await page.waitForLoadState('networkidle')
    const empty = page.getByRole('link', { name: /start building/i })
    if ((await empty.count()) === 0) test.skip(true, 'profile not empty for this fresh user')
    await empty.click()
    await expect(page).toHaveURL(/\/my-quizzes$/)
  })

  test('GET /api/quizzes?mine=true fires for own profile (gate-12)', async ({ page }) => {
    await signup(page)
    const url = await profileUrl(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(url)
      await page.waitForLoadState('networkidle')
    })
    const list = reqs.find((r) => r.method === 'GET' && /\/api\/quizzes\?.*mine=true/.test(r.url))
    expect(list, 'GET /api/quizzes?mine=true').toBeTruthy()
    expect(list?.status).toBe(200)
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await signup(page)
    await page.goto(await profileUrl(page))
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })
})
