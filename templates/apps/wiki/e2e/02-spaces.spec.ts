import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { createSpace, signup } from './_helpers.js'

test.describe('spaces', () => {
  test('user can create a space via the dialog and see it in the list', async ({ page }) => {
    await signup(page)

    await page.goto('/spaces')
    await expect(page.getByTestId('spaces-page')).toBeVisible()

    await page.getByTestId('new-space-button').click()
    await expect(page.getByTestId('new-space-dialog')).toBeVisible()
    await page.getByTestId('new-space-name').fill('Design system')
    await page.getByTestId('new-space-submit').click()

    await page.waitForTimeout(800)
    await expect(page.getByText('Design system').first()).toBeVisible({ timeout: 10_000 })
  })

  test('clicking a space card routes to /search?space_id=<id> (not 404)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const space = await createSpace(page, accessToken, { name: 'Engineering' })

    await page.goto('/spaces')
    await expect(page.getByTestId(`space-card-${space.slug}`)).toBeVisible({ timeout: 10_000 })
    await page.getByTestId(`space-card-${space.slug}`).click()

    await expect(page).toHaveURL(new RegExp(`/search\\?space_id=${space.id}`))
    await expect(page.getByTestId('search-page')).toBeVisible()
  })
})
