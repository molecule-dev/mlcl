import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { createPage, getMe, signup } from './_helpers.js'

test.describe('home + templates', () => {
  test('home renders greeting + KPIs + recent pages list', async ({ page }) => {
    const { accessToken } = await signup(page)
    const me = await getMe(page, accessToken)

    // Seed a recent page so the list is populated.
    await createPage(page, accessToken, me.defaultSpace.id, {
      title: 'Recent doc',
      content: '# recent\n\nbody',
    })

    await page.goto('/home')
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(page.getByTestId('home-greeting')).toBeVisible()
    await expect(page.getByTestId('home-recent')).toContainText('Recent doc')
    await expect(page.getByTestId('home-spaces')).toBeVisible()
  })

  test('Templates page lists template cards and links to /page/new/edit?template=...', async ({
    page,
  }) => {
    await signup(page)
    await page.goto('/templates')

    await expect(page.getByText(/RFC$/i).first()).toBeVisible()
    await expect(page.getByText(/post-mortem/i).first()).toBeVisible()

    // Click the RFC template — should navigate to /page/new/edit?template=rfc with body pre-filled.
    await page.getByText(/RFC$/i).first().click()
    await expect(page).toHaveURL(/\/page\/new\/edit\?template=rfc/, { timeout: 10_000 })
    await expect(page.getByTestId('page-editor-body')).toContainText('RFC —', { timeout: 10_000 })
  })
})
