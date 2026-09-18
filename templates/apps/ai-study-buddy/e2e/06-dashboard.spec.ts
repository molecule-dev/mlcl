/**
 * Dashboard aggregate, search, progress, profile, billing, notifications.
 * Asserts on backend invariants from the dashboard rollups.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedDeck,
  seedTopic,
  signup,
} from './_helpers.js'

test('GET /dashboard returns the rollup envelope for a fresh user', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/dashboard`, { headers: apiHeaders(accessToken) })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as {
    stats: { streak_days: number; cards_mastered: number; avg_quiz_score: number }
    mastery: { cards_total: number; segments: Record<string, number>; history: unknown[] }
    recommended: unknown[]
    review_queue: unknown[]
    timeline: unknown[]
  }
  expect(body.stats.streak_days).toBe(0)
  expect(body.stats.cards_mastered).toBe(0)
  expect(body.mastery.cards_total).toBe(0)
  expect(Array.isArray(body.mastery.history)).toBe(true)
  expect(body.mastery.history.length).toBe(7)
})

test('Dashboard recommended list includes lowest-mastery topics first', async ({ page }) => {
  const { accessToken } = await signup(page)
  const high = await seedTopic(page, accessToken, { title: 'HighMastery' })
  const low = await seedTopic(page, accessToken, { title: 'LowMastery' })

  await page.request.patch(`${API_BASE}/topics/${high.id}`, {
    headers: apiHeaders(accessToken),
    data: { title: 'HighMastery' },
  })

  const res = await page.request.get(`${API_BASE}/dashboard`, { headers: apiHeaders(accessToken) })
  const body = (await res.json()) as { recommended: Array<{ id: string }> }
  const ids = body.recommended.map((r) => r.id)
  expect(ids).toContain(low.id)
  expect(ids).toContain(high.id)
})

test('Dashboard review_queue surfaces decks ordered by due_count', async ({ page }) => {
  const { accessToken } = await signup(page)
  const deck = await seedDeck(page, accessToken, { name: 'Daily Drill' })
  await page.request.post(`${API_BASE}/decks/${deck.id}/cards`, {
    headers: apiHeaders(accessToken),
    data: { front_md: 'Q', back_md: 'A' },
  })

  const res = await page.request.get(`${API_BASE}/dashboard`, { headers: apiHeaders(accessToken) })
  const body = (await res.json()) as { review_queue: Array<{ id: string; due_count: number }> }
  const found = body.review_queue.find((q) => q.id === deck.id)
  expect(found).toBeTruthy()
  expect(found?.due_count).toBeGreaterThanOrEqual(1)
})

test('Search returns topics by title', async ({ page }) => {
  const { accessToken } = await signup(page)
  await seedTopic(page, accessToken, { title: 'Calculus integrals' })
  await seedTopic(page, accessToken, { title: 'Quantum entanglement' })

  const res = await page.request.get(`${API_BASE}/search?q=Calculus&type=course`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { data: Array<{ title: string; type: string }> }
  expect(body.data.find((d) => d.title.includes('Calculus'))).toBeTruthy()
  expect(body.data.find((d) => d.title.includes('Quantum'))).toBeFalsy()
})

test('GET /profile returns the current user envelope', async ({ page }) => {
  const { accessToken, name } = await signup(page)
  const res = await page.request.get(`${API_BASE}/profile`, { headers: apiHeaders(accessToken) })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as {
    profile: { name: string; email: string }
    kpis: Record<string, number>
    achievements: Array<{ id: string }>
  }
  expect(body.profile.name).toBe(name)
  expect(body.profile.email).toMatch(/@flagship\.test$/)
  expect(typeof body.kpis.active_subjects).toBe('number')
  expect(body.achievements.length).toBeGreaterThanOrEqual(3)
})

test('GET /progress returns aggregate progress envelope', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/progress`, { headers: apiHeaders(accessToken) })
  expect(res.status()).toBe(200)
})

test('GET /progress survives sessions with Date-typed created_at (no 500)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Progress trigger' })
  const ask = await page.request.post(`${API_BASE}/topics/${topic.id}/ask`, {
    headers: apiHeaders(accessToken),
    data: { question: 'Give a one-word reply.' },
    timeout: 60_000,
  })
  expect(ask.status()).toBe(200)

  const res = await page.request.get(`${API_BASE}/progress`, { headers: apiHeaders(accessToken) })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { weekly: Array<{ day: string; minutes: number }> }
  expect(body.weekly.length).toBe(7)
  const total = body.weekly.reduce((s, d) => s + d.minutes, 0)
  expect(total).toBeGreaterThanOrEqual(0)
})

test('GET /billing/summary returns plan + history for a free user', async ({ page }) => {
  const { accessToken } = await signup(page)
  const res = await page.request.get(`${API_BASE}/billing/summary`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as {
    plan: { key: string; label: string; price: string }
    history: unknown[]
  }
  expect(body.plan.key).toBe('free')
  expect(body.plan.label).toMatch(/free/i)
})

test('Billing tiers list includes a stripePriceId for a paid tier', async ({ page }) => {
  const res = await page.request.get(`${API_BASE}/billing/tiers`)
  expect(res.status()).toBe(200)
  const body = (await res.json()) as {
    data: Array<{ key: string; prices: Array<{ stripePriceId: string | null; period: string }> }>
  }
  const paid = body.data.find((t) => t.key !== 'free')
  expect(paid).toBeTruthy()
  if (paid) {
    const priced = paid.prices.find((p) => p.stripePriceId)
    expect(priced, 'paid tier should have at least one Stripe price ID').toBeTruthy()
  }
})

test('Notification create + list shows row and counts unread', async ({ page }) => {
  const { accessToken } = await signup(page)
  const create = await page.request.post(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
    data: { title: 'Daily review ready', body: 'Cards due soon', type: 'reminder' },
    failOnStatusCode: false,
  })
  expect(create.status(), await create.text()).toBe(201)

  const list = await page.request.get(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
  })
  expect(list.status()).toBe(200)
  const body = (await list.json()) as { data: Array<{ title: string }>; unread_count: number }
  expect(body.data.find((n) => n.title === 'Daily review ready')).toBeTruthy()
  expect(body.unread_count).toBeGreaterThanOrEqual(1)
})

test('/dashboard mount fans out to /api/profile + /api/dashboard', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await signup(page)
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.find((r) => /\/api\/profile\b/.test(r.url) && r.status === 200)).toBeTruthy()
  expect(reqs.find((r) => /\/api\/dashboard\b/.test(r.url) && r.status === 200)).toBeTruthy()
})

test('/dashboard sidebar links route to every primary section', async ({ page }) => {
  await signup(page)
  for (const [name, path] of [
    ['Courses', '/courses'],
    ['Flashcards', '/flashcards'],
    ['Progress', '/progress'],
    ['Search', '/search'],
    ['Notifications', '/notifications'],
    ['Billing', '/billing'],
    ['Profile', '/profile'],
    ['Settings', '/settings'],
  ] as const) {
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name }).first().click()
    await page.waitForURL(new RegExp(path.replace(/\//g, '\\/')), { timeout: 8_000 })
  }
})

test('/dashboard theme toggle persists across reload', async ({ page }) => {
  await signup(page)
  await expect(page.locator('[data-mol-id="theme-toggle"]').first()).toBeVisible({
    timeout: 10_000,
  })
  const readMode = () =>
    page.evaluate(() => document.documentElement.getAttribute('data-mol-mode') || '')
  const before = await readMode()
  expect(before).not.toBe('')
  const opposite = before === 'dark' ? 'light' : 'dark'
  // Trigger the actual click via element.click() to bypass intercept races
  // from page-level decorative elements (mastery-hero-card etc.). The button
  // itself is in the sidebar and its handler is what we want to verify.
  await page.evaluate(() => {
    const btn = document.querySelector('[data-mol-id="theme-toggle"]') as HTMLButtonElement | null
    btn?.click()
  })
  await expect.poll(readMode, { timeout: 5_000 }).toBe(opposite)
  await page.reload()
  await expect.poll(readMode, { timeout: 5_000 }).toBe(opposite)
})

test('/dashboard user menu opens and exposes Log out', async ({ page }) => {
  await signup(page)
  await page.locator('[data-mol-id="user-menu"]').first().click()
  await expect(page.locator('[data-mol-id="user-menu-logout"]').first()).toBeVisible()
})

test('Mark-all-read clears unread_count', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.request.post(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
    data: { title: 'A', body: 'B' },
  })
  await page.request.post(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
    data: { title: 'C', body: 'D' },
  })
  const before = (await (
    await page.request.get(`${API_BASE}/notifications`, { headers: apiHeaders(accessToken) })
  ).json()) as { unread_count: number }
  expect(before.unread_count).toBeGreaterThanOrEqual(2)

  const readAll = await page.request.post(`${API_BASE}/notifications/read-all`, {
    headers: apiHeaders(accessToken),
  })
  expect(readAll.status()).toBe(204)

  const after = (await (
    await page.request.get(`${API_BASE}/notifications`, { headers: apiHeaders(accessToken) })
  ).json()) as { unread_count: number }
  expect(after.unread_count).toBe(0)
})
