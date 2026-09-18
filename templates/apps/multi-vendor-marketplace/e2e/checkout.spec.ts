import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, addRandomProductToCart, captureNetwork, signup } from './_helpers.js'

test.describe('/checkout', () => {
  test('first name accepts input', async ({ page }) => {
    await signup(page)
    await addRandomProductToCart(page)
    await page.goto(APP_BASE + '/checkout')
    await expect(page.locator('input[name="firstName"]')).toBeVisible()
    await page.locator('input[name="firstName"]').fill('Walker')
    await expect(page.locator('input[name="firstName"]')).toHaveValue('Walker')
  })

  test('street accepts input', async ({ page }) => {
    await signup(page)
    await addRandomProductToCart(page)
    await page.goto(APP_BASE + '/checkout')
    await expect(page.locator('input[name="street"]')).toBeVisible()
    await page.locator('input[name="street"]').fill('1 Main St')
    await expect(page.locator('input[name="street"]')).toHaveValue('1 Main St')
  })

  test('advance loads next step', async ({ page }) => {
    await signup(page)
    await addRandomProductToCart(page)
    await page.goto(APP_BASE + '/checkout')
    await page.locator('input[name="firstName"]').fill('Walker')
    await page.locator('input[name="lastName"]').fill('Tester')
    await page.locator('input[name="street"]').fill('1 Main St')
    await page.locator('input[name="city"]').fill('Springfield')
    await page.locator('input[name="state"]').fill('MA')
    await page.locator('input[name="postal"]').fill('01103')
    await captureNetwork(page, async () => {
      await page.getByTestId('checkout-advance').click()
    })
    await expect(page.getByRole('heading', { name: /payment method/i })).toBeVisible()
  })
})
