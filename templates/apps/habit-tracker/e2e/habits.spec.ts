/**
 * Habits index: lists the user's habits, supports category filters,
 * and the "+ New habit" button routes to /habits/new.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedHabit, signup } from './_helpers.js'

test('habits list renders user habits and isolates per-tenant', async ({ page, browser }) => {
  // User A: one habit, "Walk 30 min".
  const { accessToken } = await signup(page)
  await seedHabit(page, accessToken, 'Walk 30 min')

  await page.goto(APP_BASE + '/habits')
  await expect(page.getByText('Walk 30 min').first()).toBeVisible({ timeout: 10_000 })

  // User B: separate context, separate habit list. Should NOT see User A's habit.
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p)
  await p.goto(APP_BASE + '/habits')
  await expect(p.getByText('Walk 30 min')).toHaveCount(0)
  await expect(p.getByText('No habits in this category.')).toBeVisible({ timeout: 10_000 })
  await ctx.close()
})

test('"+ New habit" button navigates to /habits/new', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/habits')
  await page.getByRole('button', { name: /new habit/i }).click()
  await page.waitForURL(/\/habits\/new/, { timeout: 10_000 })
})

test('category filter narrows the visible list', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.request.post(`${API_BASE}/habits`, {
    headers: apiHeaders(accessToken),
    data: { name: 'Run', emoji: '🏃', category: 'health', cadence: 'daily' },
  })
  await page.request.post(`${API_BASE}/habits`, {
    headers: apiHeaders(accessToken),
    data: { name: 'Read', emoji: '📚', category: 'learning', cadence: 'daily' },
  })

  await page.goto(APP_BASE + '/habits')
  await expect(page.getByText('Run')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Read')).toBeVisible()

  await page.getByRole('button', { name: 'Health', exact: true }).click()
  await expect(page.getByText('Run')).toBeVisible()
  await expect(page.getByText('Read')).toHaveCount(0)

  await page.getByRole('button', { name: 'All', exact: true }).click()
  await expect(page.getByText('Run')).toBeVisible()
  await expect(page.getByText('Read')).toBeVisible()
})

test('habits page issues GET /api/habits on first load', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/habits')
    await page.waitForLoadState('networkidle')
  })
  const get = reqs.find((r) => r.method === 'GET' && /\/api\/habits$/.test(r.url))
  expect(get?.status, JSON.stringify(reqs)).toBe(200)
})

test('clicking a habit card navigates to its detail page', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Click target')
  await page.goto(APP_BASE + '/habits')
  await page.getByText('Click target').first().click()
  await page.waitForURL(new RegExp(`/habits/${id}$`), { timeout: 10_000 })
})

test('Mind category filter shows only mind habits', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.request.post(`${API_BASE}/habits`, {
    headers: apiHeaders(accessToken),
    data: { name: 'Stretch', emoji: '🧘', category: 'mind', cadence: 'daily' },
  })
  await page.request.post(`${API_BASE}/habits`, {
    headers: apiHeaders(accessToken),
    data: { name: 'Run', emoji: '🏃', category: 'health', cadence: 'daily' },
  })
  await page.goto(APP_BASE + '/habits')
  await page.getByRole('button', { name: 'Mind', exact: true }).click()
  await expect(page.getByText('Stretch')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Run')).toHaveCount(0)
})

test('archived habits drop out of the visible list', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Archive me')
  await page.request.post(`${API_BASE}/habits/${id}/archive`, {
    headers: apiHeaders(accessToken),
    data: {},
  })
  await page.goto(APP_BASE + '/habits')
  await expect(page.getByText('Archive me')).toHaveCount(0, { timeout: 10_000 })
})

test('Learning category filter ends up empty when no learning habits exist', async ({ page }) => {
  const { accessToken } = await signup(page)
  await seedHabit(page, accessToken, 'Some health habit') // category=health
  await page.goto(APP_BASE + '/habits')
  await page.getByRole('button', { name: 'Learning', exact: true }).click()
  await expect(page.getByText('No habits in this category.')).toBeVisible({ timeout: 10_000 })
})
