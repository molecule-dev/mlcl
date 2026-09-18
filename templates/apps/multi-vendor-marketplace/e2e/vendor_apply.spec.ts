import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/vendor/apply', () => {
  test('shop name field accepts input', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/vendor/apply')
    await page.getByTestId('vendor-onboarding-shopName').fill('Walker Workshop')
    await expect(page.getByTestId('vendor-onboarding-shopName')).toHaveValue('Walker Workshop')
  })

  test('advance moves to next step', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/vendor/apply')
    await page.getByTestId('vendor-onboarding-shopName').fill('Walker Workshop')
    await page.getByTestId('vendor-onboarding-advance').click()
    await expect(page.getByText(/Categories/i).first()).toBeVisible()
  })

  test('submission POSTs /api/vendors/apply', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/vendor/apply')
    await page.getByTestId('vendor-onboarding-shopName').fill('Walker Workshop')
    await page.getByTestId('vendor-onboarding-advance').click()
    await page.getByRole('button', { name: 'Home & Living' }).click()
    await page.getByTestId('vendor-onboarding-advance').click()
    await page.getByTestId('vendor-onboarding-bankAccount').fill('GB29 NWBK 6016 1331 9268 19')
    await page.getByTestId('vendor-onboarding-advance').click()
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('vendor-onboarding-advance').click()
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => /\/api\/vendors\/apply/.test(r.url) && r.method === 'POST'),
    ).toBeTruthy()
  })
})
