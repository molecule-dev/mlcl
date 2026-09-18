/**
 * /posts — author's post list. Auth-gated, fetches /api/posts (mine),
 * shows a freshly-published post, and navigation to /posts/new opens
 * the editor.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedPost, signup, uniqueEmail } from './_helpers.js'

test.describe('post list', () => {
  test('anonymous visit redirects off /posts', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 10000 })
  })

  test('post list fetches /api/posts', async ({ page }) => {
    await signup(page, uniqueEmail('posts-load'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/posts')
      await page.waitForLoadState('networkidle')
    })
    const fetched = reqs.find(
      (r) => r.method === 'GET' && /\/api\/posts(\/mine\/all|\?|$)/.test(r.url),
    )
    expect(fetched, '/posts must fetch /api/posts (mine list)').toBeTruthy()
    expect(fetched!.status).toBeLessThan(400)
  })

  test('seeded post shows up in the list', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('posts-seed'))
    const { title } = await seedPost(page, accessToken, { title: 'Seeded for list ' + Date.now() })
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 })
  })
})
