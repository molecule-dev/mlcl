import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiHeaders, API_BASE, createPage, getMe, signup } from './_helpers.js'

test.describe('version history', () => {
  test('every save creates a new version row visible in /page/:id/history', async ({ page }) => {
    const { accessToken } = await signup(page)
    const me = await getMe(page, accessToken)

    const created = await createPage(page, accessToken, me.defaultSpace.id, {
      title: 'Versioned UI doc',
      content: '# v1',
    })

    // Two more updates.
    for (const v of ['v2', 'v3']) {
      const r = await page.request.put(`${API_BASE}/pages/${created.id}`, {
        headers: apiHeaders(accessToken),
        data: { title: `Versioned UI doc ${v}`, content: `# ${v}` },
      })
      expect(r.status()).toBe(200)
    }

    await page.goto(`/page/${created.id}/history`)
    await expect(page.getByTestId('version-history-page')).toBeVisible()
    await expect(page.getByTestId('versions-list')).toBeVisible({ timeout: 10_000 })

    // 3 rows, one per version.
    await expect(page.getByTestId('version-row-1')).toBeVisible()
    await expect(page.getByTestId('version-row-2')).toBeVisible()
    await expect(page.getByTestId('version-row-3')).toBeVisible()

    // The newest row is "current" — restore button should be disabled when looking at it.
    await page.getByTestId('version-row-3').click()
    await expect(page.getByTestId('version-restore')).toBeDisabled({ timeout: 5_000 })

    // Pick an older version and restore — should land back on the page view.
    await page.getByTestId('version-row-1').click()
    await expect(page.getByTestId('version-restore')).toBeEnabled({ timeout: 5_000 })
    await page.getByTestId('version-restore').click()
    await page.waitForURL(new RegExp(`/page/${created.id}$`), { timeout: 15_000 })

    // Restored version content should be on the page now.
    await expect(page.getByTestId('page-view-body')).toContainText('v1', { timeout: 10_000 })
  })
})
