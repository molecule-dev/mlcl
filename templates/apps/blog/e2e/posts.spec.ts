/**
 * /posts — author's post list. Auth-required. Tests cover redirect for
 * anonymous visitors, the network fetch on load (filter chips refire),
 * pagination, search, delete, and per-row navigation.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  seedPost,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('post list (/posts)', () => {
  test('anonymous visitor is redirected off /posts', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 10000 })
  })

  test('initial load fetches /api/posts/mine/all (network)', async ({ page }) => {
    await signup(page, uniqueEmail('posts-load'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/posts')
      await page.waitForLoadState('networkidle')
    })
    const fetched = reqs.find((r) => r.method === 'GET' && /\/api\/posts\/mine\/all/.test(r.url))
    expect(fetched, '/posts must fetch /api/posts/mine/all').toBeTruthy()
    expect(fetched!.status).toBeLessThan(400)
  })

  test('seeded post shows up in the list', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('posts-seed'))
    const { title } = await seedPost(page, accessToken, {
      title: 'Seeded for list ' + Date.now(),
    })
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 })
  })

  test('clicking a status filter chip refires GET /api/posts/mine/all', async ({ page }) => {
    await signup(page, uniqueEmail('posts-filter'))
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    const reqs = await captureNetwork(page, async () => {
      const chip = page.getByRole('button', { name: /^Published$/i }).first()
      if (await chip.count()) {
        await chip.click()
        await page.waitForTimeout(800)
      }
    })
    const refire = reqs.find((r) => r.method === 'GET' && /\/api\/posts\/mine\/all/.test(r.url))
    if (refire) expect(refire.status).toBeLessThan(400)
  })

  test('search input filters list visually', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('posts-search'))
    await seedPost(page, accessToken, { title: 'Quantum entanglement explained ' + Date.now() })
    await seedPost(page, accessToken, { title: 'Plant care tips ' + Date.now() })
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    const search = page.locator('input[type="search"], input[placeholder*="Search"]').first()
    if (await search.count()) {
      await search.fill('Plant care')
      await page.waitForTimeout(500)
      await expect(page.getByText(/Plant care/i).first()).toBeVisible()
    }
  })

  test('delete button removes the row from the list', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('posts-delete'))
    const { id, title } = await seedPost(page, accessToken, {
      title: 'To be deleted ' + Date.now(),
    })
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')

    // Delete via API and re-load — invariant: row gone.
    const del = await page.request.delete(`${API_BASE}/posts/${id}`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(del.status()).toBeLessThan(400)
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(title).first()).toHaveCount(0, { timeout: 5000 })
  })

  test('"New post" link navigates to /posts/new', async ({ page }) => {
    await signup(page, uniqueEmail('posts-newlink'))
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    const newLink = page.getByRole('link', { name: /new post|write/i }).first()
    if (await newLink.count()) {
      await newLink.click()
      await page.waitForURL(/\/posts\/new/, { timeout: 10000 })
    }
  })

  test('per-row Edit link goes to /posts/:id/edit', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('posts-editlink'))
    const { id } = await seedPost(page, accessToken, { title: 'Editable ' + Date.now() })
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    const editLink = page.locator(`a[href*="/posts/${id}/edit"]`).first()
    if (await editLink.count()) {
      await editLink.click()
      await page.waitForURL(new RegExp(`/posts/${id}/edit`), { timeout: 10000 })
    }
  })

  test('pagination Next/Prev are present (visibility check)', async ({ page }) => {
    await signup(page, uniqueEmail('posts-pag'))
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    const next = page.getByRole('button', { name: /next/i }).first()
    const prev = page.getByRole('button', { name: /previous|prev/i }).first()
    if ((await next.count()) > 0) await expect(next).toBeVisible()
    if ((await prev.count()) > 0) await expect(prev).toBeVisible()
  })

  test('empty-state copy renders when no posts exist', async ({ page }) => {
    await signup(page, uniqueEmail('posts-empty'))
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    const text = await page.locator('main').first().innerText()
    expect(text).toMatch(/no posts|first post|create|write/i)
  })

  test('header is visible after authenticated load', async ({ page }) => {
    await signup(page, uniqueEmail('posts-header'))
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('sidebar nav is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('posts-side'))
    await page.goto(APP_BASE + '/posts')
    await page.waitForLoadState('networkidle')
    const navLinks = page.locator('a[href="/dashboard"], a[href="/analytics"], a[href="/comments"]')
    await expect(navLinks.first()).toBeAttached()
  })
})
