import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/home (Navigate → /c)', () => {
  test('Navigating to /home redirects to /c (categories list)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/home')
    await expect(page).toHaveURL(/\/c$/, { timeout: 10_000 })
  })

  test('After redirect the categories hero is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/home')
    await expect(page).toHaveURL(/\/c$/, { timeout: 10_000 })
    await expect(
      page.getByText(/Pick a room|All categories|Where the conversation lives/i).first(),
    ).toBeVisible({
      timeout: 15_000,
    })
  })

  test('Replace navigation: back from /c after /home does NOT return to /home', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/c')
    await page.goto(APP_BASE + '/home')
    await expect(page).toHaveURL(/\/c$/, { timeout: 10_000 })
    await page.goBack()
    await expect(page).not.toHaveURL(/\/home$/, { timeout: 5_000 })
  })

  test('After /home redirect, GET /api/categories-rich fires (captureNetwork invariant)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/home')
      await expect(page).toHaveURL(/\/c$/, { timeout: 10_000 })
      await page.waitForTimeout(1500)
    })
    const cats = reqs.find((r) => /\/api\/categories-rich(\?|$)/.test(r.url) && r.method === 'GET')
    expect(cats, 'GET /api/categories-rich must fire after redirect').toBeTruthy()
    expect(cats!.status).toBe(200)
  })
})
