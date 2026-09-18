import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers.js'

// The thank-you page is a static confirmation parameterised by the slug in the
// URL — it never fetches the survey. So the specs drive slugs they own rather
// than a slug out of the demo fixtures, which an app's owner replaces first.
const SPEC_SLUG = 'spec-owned-slug'
const OTHER_SPEC_SLUG = 'another-spec-owned-slug'

test.describe('public thank-you /s/:slug/thank-you', () => {
  test('renders confirmation heading and "Response received" eyebrow', async ({ page }) => {
    await page.goto(`${APP_BASE}/s/${SPEC_SLUG}/thank-you`)
    await expect(page.getByRole('heading', { name: /thanks|recorded|received/i })).toBeVisible()
    await expect(page.getByText(/response received/i).first()).toBeVisible()
  })

  test('"Take another response" navigates back to /s/:slug', async ({ page }) => {
    await page.goto(`${APP_BASE}/s/${SPEC_SLUG}/thank-you`)
    await page
      .getByRole('link', { name: /take another|retake|replay/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`/s/${SPEC_SLUG}$`))
  })

  test('"Visit Gauge" link navigates to /', async ({ page }) => {
    await page.goto(`${APP_BASE}/s/${SPEC_SLUG}/thank-you`)
    await page
      .getByRole('link', { name: /visit gauge|home/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('preserves slug parameter when retaking', async ({ page }) => {
    await page.goto(`${APP_BASE}/s/${OTHER_SPEC_SLUG}/thank-you`)
    await page
      .getByRole('link', { name: /take another|retake|replay/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`/s/${OTHER_SPEC_SLUG}$`))
  })
})
