import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getPrompts, signup } from './_helpers'

test.describe('/prompts', () => {
  test('renders Prompt library heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/prompts')
    await expect(page.getByRole('heading', { level: 1, name: /Prompt library/i })).toBeVisible()
  })

  test('"All" filter button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/prompts')
    await expect(page.getByRole('button', { name: /^All$/ })).toBeVisible()
  })

  test('"Favorites" filter shows empty state for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/prompts')
    await page.waitForResponse((r) => r.url().includes('/api/journal/prompts'), { timeout: 10_000 })
    await page.getByRole('button', { name: /^Favorites$/ }).click()
    // No favorites yet — empty-state message should appear
    await expect(page.getByText(/No prompts match this filter|No favorites/i)).toBeVisible({
      timeout: 5_000,
    })
  })

  test('a category filter narrows the list to that category', async ({ page }) => {
    await signup(page)
    // Drive whichever category the library actually holds prompts for — the
    // category chips are the app's own fixed list, the prompts behind them
    // are content an app's owner replaces.
    const library = await getPrompts(page)
    expect(library.length, 'prompt library is non-empty').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/prompts')
    await page.waitForResponse((r) => r.url().includes('/api/journal/prompts'), { timeout: 10_000 })

    // One favorite-toggle renders per prompt card, so it counts the cards.
    const cards = page.getByRole('button', { name: /save favorite|remove favorite/i })
    await expect(cards).toHaveCount(library.length)

    const counts = new Map<string, number>()
    for (const p of library) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
    // Smallest category first, so the filter demonstrably narrows the list.
    const ordered = [...counts.entries()].sort((a, b) => a[1] - b[1])
    let picked: { category: string; size: number } | null = null
    for (const [category, size] of ordered) {
      const chip = page.getByRole('button', { name: new RegExp(`^${category}$`, 'i') })
      if (await chip.count()) {
        picked = { category, size }
        break
      }
    }
    if (!picked) throw new Error('no category chip matches a category the library holds')

    await page
      .getByRole('button', { name: new RegExp(`^${picked.category}$`, 'i') })
      .first()
      .click()
    await expect(cards).toHaveCount(picked.size)
  })

  test('favorite-toggle button POSTs /api/journal/prompts/:id/favorite and persists', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/prompts')
    // Wait for the prompts list to render
    await expect(page.getByRole('button', { name: /save favorite/i }).first()).toBeVisible({
      timeout: 10_000,
    })

    const reqs = await captureNetwork(page, async () => {
      const fav = page.getByRole('button', { name: /save favorite/i }).first()
      await fav.click()
      // Optimistic toggle should flip the button state immediately
      await expect(page.getByRole('button', { name: /remove favorite/i }).first()).toBeVisible({
        timeout: 5_000,
      })
      // Give the network a moment to fire the request
      await page.waitForTimeout(500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/prompts\/[^/]+\/favorite/.test(r.url))
    expect(post, 'favorite POST observed').toBeDefined()
    expect(post!.status).toBeLessThan(300)
  })

  test('"Write about this" link opens the composer with the chosen prompt', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/prompts')
    const link = page.getByRole('link', { name: /Write about this/i }).first()
    const href = await link.getAttribute('href')
    // Carries the chosen prompt into the composer: /journal/new?prompt=<slug>&text=<text>
    expect(href).toMatch(/^\/journal\/new\?prompt=.+&text=.+/)
  })
})
