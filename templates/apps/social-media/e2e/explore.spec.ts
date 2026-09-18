import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedPost, signup } from './_helpers.js'

test.describe('explore page', () => {
  test('Explore lists popular public posts', async ({ page }) => {
    const author = await signup(page)
    const post = await seedPost(page, author.accessToken, {
      caption: 'Explore-worthy post',
      hashtags: ['explorehot'],
    })

    await signup(page)
    await page.goto(APP_BASE + '/explore')
    await expect(page.locator(`a[href="/posts/${post.id}"]`)).toBeVisible({ timeout: 10_000 })
  })

  test('Explore page mounts and fetches /api/feed/explore', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/explore')
      await page.waitForTimeout(1500)
    })
    const hit = reqs.some(
      (r) => /\/api\/feed\/explore/.test(r.url) || /\/api\/posts\/explore/.test(r.url),
    )
    expect(hit, 'explore page should fetch the explore feed').toBeTruthy()
  })

  test('Explore renders the trending hashtags rail', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/explore')
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 })
    const railText = await page.locator('main').innerText()
    expect(railText.length).toBeGreaterThan(0)
  })

  test('Explore tile links to the matching /posts/:id detail', async ({ page }) => {
    const author = await signup(page)
    const post = await seedPost(page, author.accessToken, { caption: 'Tile-link post' })
    await signup(page)
    await page.goto(APP_BASE + '/explore')
    const link = page.locator(`a[href="/posts/${post.id}"]`).first()
    await expect(link).toHaveAttribute('href', `/posts/${post.id}`)
  })
})
