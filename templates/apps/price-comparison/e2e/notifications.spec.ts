import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  listNotifications,
  seedCatalog,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/notifications', () => {
  test('shell renders', async ({ page }) => {
    await signup(page, uniqueEmail('notif-shell'))
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-test=notifications-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('feed populates from auto-seeded notifications after seeding products', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-feed'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-test=notifications-feed]')).toBeVisible({ timeout: 15_000 })
    const list = await listNotifications(page, accessToken)
    expect(list.length).toBeGreaterThanOrEqual(1)
  })

  test('"Mark all read" issues POST /api/notifications/mark-all-read', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-read'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-test=notifications-page]')).toBeVisible({ timeout: 15_000 })
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-test=notifications-mark-read]').click()
      await page.waitForTimeout(800)
    })
    const post = reqs.find(
      (r) => /\/api\/notifications\/mark-all-read/.test(r.url) && r.method === 'POST',
    )
    expect(post, 'POST mark-all-read fired').toBeTruthy()
  })

  test('drops filter narrows feed', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-drops'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-test=notifications-page]')).toBeVisible({ timeout: 15_000 })
    await page.locator('[data-test=notifications-filter-drop]').click()
    await page.waitForTimeout(300)
  })

  test('alerts filter narrows feed', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-alerts'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-test=notifications-page]')).toBeVisible({ timeout: 15_000 })
    await page.locator('[data-test=notifications-filter-alert]').click()
    await page.waitForTimeout(300)
  })

  test('All filter resets to all rows', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-all'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-test=notifications-page]')).toBeVisible({ timeout: 15_000 })
    await page.locator('[data-test=notifications-filter-drop]').click()
    await page.locator('[data-test=notifications-filter-all]').click()
    await page.waitForTimeout(300)
  })
})
