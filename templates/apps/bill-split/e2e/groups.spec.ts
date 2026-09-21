import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, createGroupViaApi, getGroups, signup } from './_helpers.js'

test.describe('/groups page', () => {
  test('header and empty-state-free list render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/groups')
    await expect(page.locator('[data-mol-id="page-groups"]')).toBeVisible()
    // First authenticated request seeds demo groups, so the grid exists.
    await expect(page.locator('[data-mol-id="groups-grid"]')).toBeVisible()
  })

  test('every group the API returns is a card linking to its detail', async ({ page }) => {
    const { accessToken } = await signup(page)
    const created = await createGroupViaApi(page, accessToken)
    await page.goto(APP_BASE + '/groups')
    const groups = await getGroups(page, accessToken)
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      await expect(page.locator(`[data-mol-id="group-card-${group.id}"]`)).toBeVisible()
    }
    await page.locator(`[data-mol-id="group-card-${created.id}"]`).click()
    await page.waitForURL(new RegExp(`\\/groups\\/${created.id}`), { timeout: 5000 })
  })

  test('New group button opens the create form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/groups')
    await page.locator('[data-mol-id="btn-toggle-new-group"]').click()
    await expect(page.locator('[data-mol-id="form-new-group"]')).toBeVisible()
  })

  test('creating a group through the form adds it and navigates nowhere', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/groups')
    const before = (await getGroups(page, accessToken)).length
    await page.locator('[data-mol-id="btn-toggle-new-group"]').click()
    await page.locator('#group-name').fill('E2E UI Group')
    await page.locator('#group-members').fill('E2E Friend A, E2E Friend B')
    await page.locator('[data-mol-id="btn-submit-new-group"]').click()
    await expect(page.locator('[data-mol-id="form-new-group"]')).toBeHidden({ timeout: 10000 })
    const after = await getGroups(page, accessToken)
    expect(after.length).toBe(before + 1)
    const made = after.find((g) => g.name === 'E2E UI Group')
    expect(made, 'created group appears in the list').toBeTruthy()
    await expect(page.locator(`[data-mol-id="group-card-${made?.id}"]`)).toBeVisible()
  })

  test('cancel closes the create form without creating anything', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/groups')
    const before = (await getGroups(page, accessToken)).length
    await page.locator('[data-mol-id="btn-toggle-new-group"]').click()
    await page.locator('#group-name').fill('Should Not Exist')
    await page.locator('[data-mol-id="btn-cancel-new-group"]').click()
    await expect(page.locator('[data-mol-id="form-new-group"]')).toBeHidden()
    expect((await getGroups(page, accessToken)).length).toBe(before)
  })

  test('a group card shows its member count from the API', async ({ page }) => {
    const { accessToken } = await signup(page)
    await createGroupViaApi(page, accessToken, { member_names: ['E2E Friend One'] })
    await page.goto(APP_BASE + '/groups')
    const groups = await getGroups(page, accessToken)
    const withCount = groups.find((g) => g.member_count === 2)
    expect(withCount, 'a 2-member group exists (self + one friend)').toBeTruthy()
    await expect(
      page.locator(`[data-mol-id="group-card-${withCount?.id}"]`).getByText(/2\s*members/i),
    ).toBeVisible()
  })
})
