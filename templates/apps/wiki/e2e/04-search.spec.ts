import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { createPage, getMe, signup } from './_helpers.js'

test.describe('search', () => {
  test('typing in the search box returns matching pages', async ({ page }) => {
    const { accessToken } = await signup(page)
    const me = await getMe(page, accessToken)

    const term = `quokka${Date.now()}`
    await createPage(page, accessToken, me.defaultSpace.id, {
      title: `Findable ${term}`,
      content: `# About\n\nA page mentioning ${term} so search can hit it.`,
    })

    await page.goto('/search')
    await expect(page.getByTestId('search-page')).toBeVisible()
    await page.getByTestId('search-input').fill(term)

    await expect(page.getByTestId('search-results')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('search-results')).toContainText(`Findable ${term}`)
  })

  test('searching for nonsense shows the empty-state', async ({ page }) => {
    await signup(page)
    await page.goto('/search')
    await page.getByTestId('search-input').fill('zzzzzzznopagewithanythinglikethis')

    await expect(page.getByTestId('search-empty')).toBeVisible({ timeout: 15_000 })
  })
})
