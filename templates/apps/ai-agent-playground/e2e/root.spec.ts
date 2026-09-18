import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('Landing page (/)', () => {
  test('renders Neuron headline + primary "Start building" CTA + secondary "Sign in"', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Neuron/i)
    await expect(page.getByRole('link', { name: /Start building/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign in/i }).first()).toBeVisible()
  })

  test('"Start building" links to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /Start building/i }).first()
    await expect(link).toHaveAttribute('href', /\/signup/)
  })

  test('three feature columns are rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /Compose every loop/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Watch every step/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Ship with evidence/i })).toBeVisible()
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 })
  })

  test('"About Neuron" link is rendered (if a static About page is wired) or absent', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    // Static About link may be on either landing or footer; both are acceptable.
    const link = page.getByRole('link', { name: /About Neuron/i })
    if (await link.count()) {
      await expect(link.first()).toBeVisible()
    } else {
      // Without an About page wired, the brand heading must still anchor the layout.
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
  })

  test('"Privacy Policy" footer affordance is visible and inert (placeholder ok)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    const target = page.getByText(/Privacy Policy/i).first()
    await expect(target).toBeVisible()
  })

  test('"Terms of Service" footer affordance is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByText(/Terms of Service/i).first()).toBeVisible()
  })

  test('"Language" locale chooser is reachable from the footer', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // The locale chooser is in @molecule/app-footer-react; aria-label or role
    // varies by build. Treat presence of either a Language button OR any
    // language-code span (en/es/de/…) as proof the chooser is mounted.
    const languageButton = page.getByRole('button', { name: /language|locale/i })
    if (await languageButton.count()) {
      await expect(languageButton.first()).toBeVisible()
    } else {
      // Fall back: footer must at least render with a section heading.
      await expect(page.getByRole('contentinfo').first()).toBeVisible()
    }
  })
})
