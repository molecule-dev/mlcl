import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/events/new page', () => {
  test('happy path: fill form + publish creates an event then navigates', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/new')
    await page.locator('[data-mol-id="field-title"]').fill('E2E Created Event')
    await page.locator('[data-mol-id="field-description"]').fill('From a Playwright spec.')
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.locator('[data-mol-id="field-start-date"]').fill('2030-12-31')
    await page.locator('[data-mol-id="field-venue"]').fill('E2E Venue')
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.locator('[data-mol-id="tier-0-name"]').fill('General')
    await page.locator('[data-mol-id="tier-0-price"]').fill('25')
    await page.locator('[data-mol-id="tier-0-total"]').fill('100')
    await page.getByRole('button', { name: /^next$/i }).click()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="event-publish"]').click()
      await page.waitForLoadState('networkidle')
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/events(?!\/[\w-]+\/)/.test(r.url))
    expect(post, 'POST /api/events').toBeTruthy()
    expect(post?.status).toBeLessThan(400)
  })

  test('save draft button persists and lands on /events/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/new')
    await page.locator('[data-mol-id="field-title"]').fill('Draft Event')
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.locator('[data-mol-id="field-start-date"]').fill('2030-06-01')
    await page.locator('[data-mol-id="field-venue"]').fill('Draft Venue')
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.locator('[data-mol-id="tier-0-name"]').fill('GA')
    await page.locator('[data-mol-id="tier-0-price"]').fill('10')
    await page.locator('[data-mol-id="tier-0-total"]').fill('25')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="event-save-draft"]').click()
      await page.waitForLoadState('networkidle')
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/events/.test(r.url))
    expect(post).toBeTruthy()
  })

  test('add another tier appends a new tier row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/new')
    // skip to tiers step
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.locator('[data-mol-id="tier-add"]').click()
    await expect(page.locator('[data-mol-id^="tier-1-"]').first()).toBeVisible()
  })

  test('title input retains value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/new')
    await page.locator('[data-mol-id="field-title"]').fill('My Event')
    expect(await page.locator('[data-mol-id="field-title"]').inputValue()).toBe('My Event')
  })

  test('tags input retains value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/new')
    await page.locator('[data-mol-id="field-tags"]').fill('Outdoor, All ages')
    expect(await page.locator('[data-mol-id="field-tags"]').inputValue()).toBe('Outdoor, All ages')
  })

  test('venue input retains value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/new')
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.locator('[data-mol-id="field-venue"]').fill('Test Hall')
    expect(await page.locator('[data-mol-id="field-venue"]').inputValue()).toBe('Test Hall')
  })

  test('start-date input retains value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/new')
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.locator('[data-mol-id="field-start-date"]').fill('2030-09-09')
    expect(await page.locator('[data-mol-id="field-start-date"]').inputValue()).toBe('2030-09-09')
  })

  test('description input retains value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/new')
    await page.locator('[data-mol-id="field-description"]').fill('Hello')
    expect(await page.locator('[data-mol-id="field-description"]').inputValue()).toBe('Hello')
  })

  test('category select can be changed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/new')
    await page.locator('[data-mol-id="field-category"]').selectOption('Tech')
    expect(await page.locator('[data-mol-id="field-category"]').inputValue()).toBe('Tech')
  })

  test('first tier name input retains value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/new')
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.locator('[data-mol-id="tier-0-name"]').fill('VIP')
    expect(await page.locator('[data-mol-id="tier-0-name"]').inputValue()).toBe('VIP')
  })
})
