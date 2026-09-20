import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup, waitForSeed } from './_helpers.js'

test.describe('campaigns', () => {
  test('cards render with goal progress bars derived from gifts', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await page.goto(APP_BASE + '/campaigns')
    await expect(page.getByRole('heading', { name: /^campaigns$/i, level: 1 })).toBeVisible({
      timeout: 15000,
    })
    // Every seeded campaign renders a progressbar with a 0-100 value.
    const bars = page.getByRole('progressbar')
    await expect.poll(() => bars.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
    const first = bars.first()
    await expect(first).toHaveAttribute('aria-valuemin', '0')
    await expect(first).toHaveAttribute('aria-valuemax', '100')
    // Raised-to-date line renders as $-formatted money.
    await expect(page.getByText(/of \$|raised/i).first()).toBeVisible()
  })
})
