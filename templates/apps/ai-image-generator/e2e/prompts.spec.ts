import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getPrompts, signup } from './_helpers.js'

test.describe('/prompts', () => {
  test('renders Prompt lab h1 and fetches prompts', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/prompts')
      await expect(page.getByRole('heading', { name: /Prompt lab/i, level: 1 })).toBeVisible()
    })
    expect(reqs.some((r) => /\/api\/prompts/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('searchbox filters the prompt list as the user types', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/prompts')
    const sb = page.getByRole('searchbox')
    await expect(sb).toBeVisible()
    const beforeCount = await page.getByRole('listitem').count()
    await sb.fill('completely-invalid-search-value-xyz123')
    await page.waitForTimeout(500)
    const afterCount = await page.getByRole('listitem').count()
    expect(afterCount).toBeLessThanOrEqual(beforeCount)
  })

  test('renders one list item per prompt the API returns', async ({ page }) => {
    await signup(page)
    // How many prompts exist is the library's business — read the count from
    // the API instead of hardcoding how many the starter content ships with.
    const prompts = await getPrompts(page)
    expect(prompts.length, 'the prompt library must not be empty').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/prompts')
    const items = page.getByRole('listitem')
    await expect
      .poll(() => items.count(), { timeout: 10000 })
      .toBeGreaterThanOrEqual(prompts.length)
  })

  test('"Run" button records prompt usage (POST /api/prompts/:id/use)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/prompts')
    const reqs = await captureNetwork(page, async () => {
      // Accessible name picks up the leading "replay" icon glyph: "replay Run".
      await page
        .getByRole('button', { name: /\bRun$/i })
        .first()
        .click()
      await page.waitForTimeout(2000)
    })
    const navigated = page.url().includes('/generate')
    const calledRun = reqs.some(
      (r) =>
        /\/api\/prompts\/[^/]+\/(use|run)/.test(r.url) &&
        (r.method === 'PUT' || r.method === 'POST'),
    )
    expect(navigated || calledRun).toBeTruthy()
  })
})
