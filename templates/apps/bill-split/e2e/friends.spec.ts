import { test, expect, type Page } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup } from './_helpers.js'

async function apiFriends(
  page: Page,
  accessToken: string,
): Promise<{ id: string; name: string; email: string | null }[]> {
  const res = await page.request.get(API_BASE + '/friends', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return (await res.json()) as { id: string; name: string; email: string | null }[]
}

test.describe('/friends page', () => {
  test('header and add-friend form render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/friends')
    await expect(page.locator('[data-mol-id="page-friends"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="form-add-friend"]')).toBeVisible()
  })

  test('adding a friend through the form lists them', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/friends')
    await page.locator('#friend-name').fill('E2E Pal')
    await page.locator('#friend-email').fill('e2e-pal@example.test')
    await page.locator('[data-mol-id="btn-submit-friend"]').click()
    const friends = await apiFriends(page, accessToken)
    const made = friends.find((f) => f.email === 'e2e-pal@example.test')
    expect(made, 'friend created through the API').toBeTruthy()
    await expect(page.locator(`[data-mol-id="friend-row-${made?.id}"]`)).toBeVisible({
      timeout: 10000,
    })
  })

  test('the same email is not duplicated', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/friends')
    await page.locator('#friend-name').fill('E2E Twin')
    await page.locator('#friend-email').fill('e2e-twin@example.test')
    await page.locator('[data-mol-id="btn-submit-friend"]').click()
    await expect(page.locator('[data-mol-id="friends-notice"]')).toBeHidden({ timeout: 10000 })
    await page.locator('#friend-name').fill('E2E Twin Again')
    await page.locator('#friend-email').fill('e2e-twin@example.test')
    await page.locator('[data-mol-id="btn-submit-friend"]').click()
    await expect(page.locator('[data-mol-id="friends-notice"]')).toBeVisible({ timeout: 10000 })
    const friends = await apiFriends(page, accessToken)
    expect(friends.filter((f) => f.email === 'e2e-twin@example.test').length).toBe(1)
  })

  test('removing a friend takes them out of the list', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/friends')
    await page.locator('#friend-name').fill('E2E Departing')
    await page.locator('#friend-email').fill('e2e-departing@example.test')
    await page.locator('[data-mol-id="btn-submit-friend"]').click()
    const friends = await apiFriends(page, accessToken)
    const made = friends.find((f) => f.email === 'e2e-departing@example.test')
    expect(made).toBeTruthy()
    await expect(page.locator(`[data-mol-id="friend-row-${made?.id}"]`)).toBeVisible({
      timeout: 10000,
    })
    await page.locator(`[data-mol-id="btn-remove-friend-${made?.id}"]`).click()
    // Two-step destructive action: arm the confirm, then confirm.
    const confirm = page.locator(`[data-mol-id="btn-confirm-remove-friend-${made?.id}"]`)
    await expect(confirm).toBeVisible({ timeout: 5000 })
    await confirm.click()
    await expect(page.locator(`[data-mol-id="friend-row-${made?.id}"]`)).toBeHidden({
      timeout: 10000,
    })
  })

  test('the friend count in the header matches the API', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/friends')
    const friends = await apiFriends(page, accessToken)
    await expect(
      page
        .locator('[data-mol-id="friends-list"]')
        .getByText(new RegExp(`${friends.length}\\s*friend`)),
    ).toBeVisible({ timeout: 10000 })
  })
})
