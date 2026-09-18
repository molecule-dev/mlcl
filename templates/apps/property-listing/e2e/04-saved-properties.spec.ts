import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiContext, getAccessToken, signup, unwrapList } from './_helpers.js'

test.describe('Saved properties (bookmarks)', () => {
  test('Bookmark via /saved persists across reload', async ({ page }) => {
    await signup(page)

    const ctx = await apiContext()
    const list = unwrapList<{ id: string; title?: string; address?: string }>(
      await (await ctx.get(`${API_BASE}/properties?limit=1`)).json(),
    )
    expect(list.length, 'need at least one seeded property').toBeGreaterThan(0)
    const target = list[0]

    // Use the API to bookmark (reading back the user state through the
    // UI is fragile; the resource API is the canonical write path).
    const token = await getAccessToken(page)
    expect(token, 'expected auth token after signup').toBeTruthy()

    const bookmarkResp = await ctx.post(`${API_BASE}/bookmarks`, {
      headers: { Authorization: `Bearer ${token}` },
      // The bookmarks resource uses camelCase (resourceType / resourceId).
      data: { resourceType: 'property', resourceId: target.id },
    })
    expect(
      bookmarkResp.ok() || bookmarkResp.status() === 409,
      `bookmark create => ${bookmarkResp.status()}`,
    ).toBe(true)

    // Visit /saved and verify the bookmarked property appears.
    await page.goto('/saved')
    await page.waitForLoadState('networkidle')
    let body = await page.locator('body').innerText()
    if (target.address) {
      expect(body, 'bookmarked property should appear on /saved').toContain(
        target.address.split(',')[0].trim(),
      )
    }

    // Reload and verify it persists (read-after-write).
    await page.reload()
    await page.waitForLoadState('networkidle')
    body = await page.locator('body').innerText()
    if (target.address) {
      expect(body).toContain(target.address.split(',')[0].trim())
    }
  })

  test('Anonymous /saved renders an empty state without crashing', async ({ page }) => {
    // Clear any leftover auth state, then visit /saved as anon.
    await page.goto('/')
    await page.evaluate(() => window.localStorage.clear())
    const errs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errs.push(msg.text())
    })
    await page.goto('/saved')
    await page.waitForLoadState('networkidle')
    // Page renders something; we just need a stable, non-crashing screen.
    await expect(page.locator('body')).not.toBeEmpty()
    const fatal = errs.filter(
      (e) => !/favicon|net::ERR_|Failed to load resource|aborted|signal aborted|401|403/i.test(e),
    )
    expect(fatal, `unexpected console errors: ${fatal.join(' | ')}`).toEqual([])
  })
})
