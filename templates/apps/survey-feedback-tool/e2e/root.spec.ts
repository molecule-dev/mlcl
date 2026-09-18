import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers.js'

test.describe('landing page (/)', () => {
  test('renders Gauge logo, hero CTAs, and primary nav', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /gauge/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /start free trial/i }).first()).toBeVisible()
  })

  test('header "Sign in" navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('header "Start free trial" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start free trial/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('footer "Start trial" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^start trial$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('footer "Sign in" navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // Use the last (footer) Sign in link
    const signIns = page.getByRole('link', { name: /^sign in$/i })
    await signIns.last().click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Product / Templates / Pricing nav anchors are present', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // Anchor links may be hidden on mobile but always present in DOM
    expect(await page.locator('a[href="#product"]').count()).toBeGreaterThan(0)
    expect(await page.locator('a[href="#templates"]').count()).toBeGreaterThan(0)
    expect(await page.locator('a[href="#pricing"]').count()).toBeGreaterThan(0)
  })

  test('hero "Start free trial" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // There are multiple "Start free trial" links — header + hero. Click the
    // hero one (second occurrence) by going via `nth(1)`.
    const ctas = page.getByRole('link', { name: /start free trial/i })
    await expect(ctas.nth(1)).toBeAttached()
    await ctas.nth(1).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('NPS distribution preview render is non-empty', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // Body must contain the textual signal that the marketing preview renders
    await expect(page.getByText(/Detractors|promoters|NPS/i).first()).toBeVisible()
  })

  test('hero badge and tagline are rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByText(/surveys.*nps.*feedback|nps at scale/i).first()).toBeVisible()
  })

  test('Gauge logo (top-left) navigates to / when clicked from /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /gauge/i }).first().click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('"Browse templates" hero secondary anchor exists', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    expect(await page.locator('a[href="#templates"]').count()).toBeGreaterThan(0)
  })

  test('KPI stat cards (Active surveys / Completion rate / Promoter share) render', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByText(/active surveys/i).first()).toBeVisible()
    await expect(page.getByText(/completion rate/i).first()).toBeVisible()
    await expect(page.getByText(/promoter share/i).first()).toBeVisible()
  })
})
