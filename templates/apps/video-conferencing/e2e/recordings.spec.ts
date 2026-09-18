import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { api, signup } from './_helpers.js'

test.describe('recordings', () => {
  test('fresh user sees empty state', async ({ page }) => {
    await signup(page)
    await page.goto('/recordings')
    await expect(page.getByTestId('no-recordings')).toBeVisible()
  })

  test('listing endpoint returns array', async ({ page }) => {
    await signup(page)
    const list = await api<unknown[]>(page, 'GET', '/recordings')
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBe(0)
  })
})
