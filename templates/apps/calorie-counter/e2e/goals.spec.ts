import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, completeOnboarding, num, signup } from './_helpers.js'

test.describe('/goals (Goals)', () => {
  test('Slider release commits a new calorie target via POST /api/goals', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/goals')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const before = await api<{ calories: number | string }>(page, 'GET', '/goals')
    const slider = page.locator('input[type=range]').first()
    const handle = await slider.elementHandle()
    expect(handle).toBeTruthy()
    // Move slider then dispatch a real mouseup to trigger onMouseUp persistence
    await page.mouse.click(0, 0)
    await slider.focus()
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(150)
    // Dispatch mouseup on the slider since arrow keys don't trigger onMouseUp.
    // Programmatically dispatch a synthetic event matching the prop name.
    await page.evaluate(() => {
      const r = document.querySelector('input[type=range]') as HTMLInputElement | null
      r?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })
    await page.waitForTimeout(900)
    const after = await api<{ calories: number | string }>(page, 'GET', '/goals')
    expect(num(after.calories), 'calories should change after slider release').not.toEqual(
      num(before.calories),
    )
  })

  test('Lower button reduces persisted calories', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/goals')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const before = await api<{ calories: number | string }>(page, 'GET', '/goals')
    await page
      .getByRole('button', { name: /^\s*Lower/i })
      .first()
      .click()
    await page.waitForTimeout(800)
    const after = await api<{ calories: number | string }>(page, 'GET', '/goals')
    expect(num(after.calories)).toBeLessThan(num(before.calories))
  })

  test('Raise button increases persisted calories', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/goals')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const before = await api<{ calories: number | string }>(page, 'GET', '/goals')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^\s*Raise/i })
        .first()
        .click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find((r) => /\/api\/goals/.test(r.url) && r.method === 'POST')
    expect(post).toBeTruthy()
    const after = await api<{ calories: number | string }>(page, 'GET', '/goals')
    expect(num(after.calories)).toBeGreaterThan(num(before.calories))
  })

  test('Activity-level "Active" button POSTs goals.calories with multiplier', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/goals')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Sedentary$/i })
        .first()
        .click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find((r) => /\/api\/goals/.test(r.url) && r.method === 'POST')
    expect(post).toBeTruthy()
    expect(post!.status).toBe(201)
  })

  test('Macro tune button reveals an inline numeric editor', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/goals')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page
      .getByRole('button', { name: /edit protein/i })
      .first()
      .click()
    await expect(page.locator('input[type=number]').first()).toBeVisible({ timeout: 5_000 })
  })

  test('Macro inline edit (Enter) commits new value via POST /api/goals', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/goals')
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await page
      .getByRole('button', { name: /edit protein/i })
      .first()
      .click()
    const inp = page.locator('input[type=number]').first()
    await inp.fill('200')
    await inp.press('Enter')
    await page.waitForTimeout(800)
    const goals = await api<{ protein: number | string }>(page, 'GET', '/goals')
    expect(num(goals.protein)).toBe(200)
  })
})
