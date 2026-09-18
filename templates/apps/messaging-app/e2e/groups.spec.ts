import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, pickGroup, signup, uniqueEmail } from './_helpers.js'

test.describe('groups page', () => {
  test('lists the groups the user belongs to', async ({ page }) => {
    await signup(page, uniqueEmail('groups'))
    // Read the group under test from the API — the demo group is replaced
    // as soon as the app gets real content.
    const group = await pickGroup(page)
    await page.goto(APP_BASE + '/groups')
    await expect(page.getByText(group.name).first()).toBeVisible({ timeout: 15000 })
  })

  test('"+ New group" link goes to /groups/new', async ({ page }) => {
    await signup(page, uniqueEmail('groups-new'))
    await page.goto(APP_BASE + '/groups')
    await page
      .getByRole('link', { name: /new group|\+ new/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/groups\/new$/)
  })

  test('clicking a group opens /groups/:id', async ({ page }) => {
    await signup(page, uniqueEmail('group-click'))
    const group = await pickGroup(page)
    await page.goto(APP_BASE + '/groups')
    await page.getByRole('link', { name: group.name, exact: false }).first().click()
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/)
  })
})
