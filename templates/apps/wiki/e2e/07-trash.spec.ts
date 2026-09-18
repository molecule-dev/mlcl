import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiHeaders, API_BASE, createPage, getMe, signup } from './_helpers.js'

test.describe('trash', () => {
  test('soft-deleted page appears in /trash, restore puts it back', async ({ page }) => {
    const { accessToken } = await signup(page)
    const me = await getMe(page, accessToken)

    const created = await createPage(page, accessToken, me.defaultSpace.id, {
      title: 'Page to recycle',
      content: '# bin me',
    })
    // Soft-delete via API.
    const del = await page.request.delete(`${API_BASE}/pages/${created.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(del.status()).toBe(204)

    await page.goto('/trash')
    await expect(page.getByTestId('trash-page')).toBeVisible()
    await expect(page.getByTestId(`trash-item-${created.id}`)).toBeVisible({ timeout: 10_000 })

    await page.getByTestId(`trash-restore-${created.id}`).click()
    await expect(page.getByTestId(`trash-item-${created.id}`)).toBeHidden({ timeout: 10_000 })

    // Confirm restored: visible page.
    await page.goto(`/page/${created.id}`)
    await expect(page.getByTestId('page-view-title')).toHaveText('Page to recycle')
  })

  test('purge with permanent=true removes the page permanently', async ({ page }) => {
    const { accessToken } = await signup(page)
    const me = await getMe(page, accessToken)
    const created = await createPage(page, accessToken, me.defaultSpace.id, {
      title: 'Page to obliterate',
      content: '# obliterate me',
    })
    await page.request.delete(`${API_BASE}/pages/${created.id}`, {
      headers: apiHeaders(accessToken),
    })

    await page.goto('/trash')
    await expect(page.getByTestId(`trash-item-${created.id}`)).toBeVisible({ timeout: 10_000 })
    await page.getByTestId(`trash-purge-${created.id}`).click()
    await expect(page.getByTestId(`trash-item-${created.id}`)).toBeHidden({ timeout: 10_000 })

    // Trying to fetch the page now should 404.
    const r = await page.request.get(`${API_BASE}/pages/${created.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(r.status()).toBe(404)
  })
})
