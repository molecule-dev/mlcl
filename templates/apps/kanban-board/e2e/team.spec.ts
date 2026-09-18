import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, signupViaUI } from './_helpers.js'

test.describe('team page', () => {
  test('"Total members" KPI label is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await expect(page.getByText('Total members', { exact: true })).toBeVisible()
  })

  test('Total members value is exactly 1 (single-seat workspace)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await expect(page.getByText(/^1$/)).toBeVisible()
  })

  test('"Active boards" KPI label is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await expect(page.getByText('Active boards', { exact: true }).first()).toBeVisible()
  })

  test('"Open cards" KPI label is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await expect(page.getByText('Open cards', { exact: true }).first()).toBeVisible()
  })

  test('shows the signed-in user as the workspace owner', async ({ page }) => {
    await signupViaUI(page)
    await page.goto(APP_BASE + '/team')
    await expect(page.getByTestId('team-member-self')).toBeVisible()
  })

  test('team-self-name shows the user\u2019s display name and GET /boards + /cards fire on mount', async ({
    page,
  }) => {
    await signupViaUI(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/team')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    await expect(page.getByTestId('team-self-name')).toHaveText(/Driftboard Tester/)

    const boards = reqs.find((r) => /\/api\/boards(?:\?|$)/.test(r.url) && r.method === 'GET')
    const cards = reqs.find((r) => /\/api\/cards\?.*archived=all/.test(r.url) && r.method === 'GET')
    expect(boards, 'GET /api/boards should fire on team').toBeTruthy()
    expect(cards, 'GET /api/cards?archived=all should fire on team').toBeTruthy()
  })
})
