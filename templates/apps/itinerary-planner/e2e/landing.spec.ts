import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers'

test.describe('/', () => {
  test('renders nav, hero, and footer signup links', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /Plan it once/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign in/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Start a free trip/i }).first()).toBeVisible()
  })

  test('Start a free trip → /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Start a free trip/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Sign in link → /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Plan one of your own → /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Plan one of your own/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('How it works link is in-page anchor #features', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const a = page.getByRole('link', { name: /How it works/i }).first()
    const href = await a.getAttribute('href')
    expect(href).toBe('#features')
  })

  test('Inside Waypoint link is in-page anchor #preview', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const a = page.getByRole('link', { name: /Inside Waypoint/i }).first()
    const href = await a.getAttribute('href')
    expect(href).toBe('#preview')
  })

  test('Open itinerary sample link → /trips/:slug', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const a = page.getByRole('link', { name: /Open itinerary/i }).first()
    const href = await a.getAttribute('href')
    expect(href).toMatch(/^\/trips\/.+$/)
  })

  test('Plan another trip link is /trips/new', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const a = page.getByRole('link', { name: /Plan another trip/i }).first()
    const href = await a.getAttribute('href')
    expect(href).toBe('/trips/new')
  })

  test('Create free account link is /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const a = page.getByRole('link', { name: /Create free account/i }).first()
    const href = await a.getAttribute('href')
    expect(href).toBe('/signup')
  })

  test('Plan your first trip link is /signup or /trips/new', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // Only present on hero/empty states; assert if found
    const a = page.getByRole('link', { name: /Plan your first trip/i }).first()
    if (await a.count()) {
      const href = await a.getAttribute('href')
      expect(['/signup', '/trips/new']).toContain(href)
    }
  })

  test('See a sample trip link → #preview', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const a = page.getByRole('link', { name: /See a sample trip/i }).first()
    const href = await a.getAttribute('href')
    expect(href).toBe('#preview')
  })

  test('Waypoint logo link → /', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const a = page.getByRole('link', { name: /Waypoint/i }).first()
    const href = await a.getAttribute('href')
    expect(href).toBe('/')
  })
})
