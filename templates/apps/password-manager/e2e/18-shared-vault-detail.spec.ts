import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/shared/:id', () => {
  test('renders the vault detail page after navigating from /shared', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shared')
    await page.getByTestId('shared-toggle-form').click()
    const name = `Detail-Test-${Date.now()}`
    await page.getByTestId('shared-form-name').fill(name)
    await page.getByTestId('shared-form-description').fill('Vault detail smoke')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('shared-form-submit').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/vaults(\?|$)/.test(r.url))
    expect(post?.status).toBeLessThan(300)

    await page.getByText(name).first().click()
    await expect(page).toHaveURL(/\/shared\/[^/]+/, { timeout: 10_000 })
    await expect(page.getByTestId('shared-detail-name')).toHaveText(name)
    await expect(page.getByTestId('shared-detail-created')).toBeVisible()
  })

  test('non-existent vault shows error and back link works', async ({ page }) => {
    await signup(page)
    // The bogus id legitimately 404s — allow the expected console resource
    // error before the navigation that triggers it.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await page.goto(APP_BASE + '/shared/00000000-0000-0000-0000-000000000000')
    await expect(page.getByTestId('shared-detail-error')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('link', { name: /back to shared/i }).click()
    await expect(page).toHaveURL(/\/shared\/?$/)
  })
})
