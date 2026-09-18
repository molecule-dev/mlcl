import { expect, test } from '@molecule/app-e2e-fixtures-default'

test('Public /pricing page renders three tiers (Free, Pro, Team)', async ({ page }) => {
  // /pricing must be reachable without auth — it's a marketing page.
  await page.goto('/pricing')
  // The page is built from @molecule/app-billing-react. Verify the
  // visible tier names appear in the rendered DOM.
  const body = page.locator('body')
  await expect(body).toContainText(/Free/i, { timeout: 15_000 })
  await expect(body).toContainText(/Pro/i)
  await expect(body).toContainText(/Team/i)
})

test('Pricing tier cards render with explicit data-mol-id markers', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page.locator('[data-mol-id="pricing-tier-free"]')).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.locator('[data-mol-id="pricing-tier-pro"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="pricing-tier-team"]')).toBeVisible()
})

test('Pricing Pro CTA renders enabled (not stuck in a disabled placeholder state)', async ({
  page,
}) => {
  await page.goto('/pricing')
  const proCta = page.locator('[data-mol-id="pricing-cta-pro"]')
  await expect(proCta).toBeVisible({ timeout: 10_000 })
  // The Pro CTA must NOT be permanently disabled — that's the fingerprint
  // of an unwired upgrade button. The Free tier CTA is intentionally
  // disabled because the visitor is already on the free plan.
  await expect(proCta).toBeEnabled()
})

test('Pricing Free CTA exists and reflects the current-plan state', async ({ page }) => {
  await page.goto('/pricing')
  const freeCta = page.locator('[data-mol-id="pricing-cta-free"]')
  await expect(freeCta).toBeVisible({ timeout: 10_000 })
  // The Free tier CTA labels itself as the current plan.
  await expect(freeCta).toHaveText(/current\s*plan|free/i)
})
