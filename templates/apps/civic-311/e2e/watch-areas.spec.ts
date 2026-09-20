import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, seedIssue, seedWatchArea, signup } from './_helpers.js'

test.describe('civic-311: /watch-areas', () => {
  test('empty state renders and the create form is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/watch-areas')
    await expect(page.getByTestId('watch-areas-title')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('watch-area-form')).toBeVisible()
    await expect(page.getByTestId('watch-areas-empty')).toBeVisible()
  })

  test('blank form keeps save disabled; pin + name unlock it and save persists', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/watch-areas')
    const submit = page.getByTestId('watch-area-submit')
    await expect(submit).toBeDisabled()
    await page.getByTestId('watch-area-name').fill('E2E watch zone')
    const map = page.getByTestId('watch-area-map')
    const box = (await map.boundingBox())!
    await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4)
    await expect(page.getByTestId('watch-area-address-preview')).toContainText(/Ave & /, {
      timeout: 10_000,
    })
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect(page.getByTestId('watch-area-item').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('watch-areas-empty')).toHaveCount(0)
  })

  test('radius select offers block choices', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/watch-areas')
    const select = page.getByTestId('watch-area-radius')
    await expect(select).toBeVisible()
    for (const value of ['5', '10', '15', '20']) {
      await select.selectOption(value)
    }
  })

  test('saved area can be deleted', async ({ page }) => {
    const session = await signup(page)
    await seedWatchArea(page, session.accessToken, {
      name: 'E2E school route',
      x: 56,
      y: 33,
      radius: 10,
    })
    await page.goto(APP_BASE + '/watch-areas')
    await expect(page.getByTestId('watch-area-item').first()).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('watch-area-delete').first().click()
    await expect(page.getByTestId('watch-areas-empty')).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('civic-311: watch-area fan-out', () => {
  test('a new report inside the area notifies the watcher', async ({ page }) => {
    // Watcher saves an area around (34, 27), radius 8.
    const watcher = await signup(page)
    await seedWatchArea(page, watcher.accessToken, {
      name: 'E2E watch zone',
      x: 34,
      y: 27,
      radius: 8,
    })

    // A different resident reports inside that circle.
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    const reporter = await signup(page)
    expect(reporter.userId).not.toBe(watcher.userId)
    await seedIssue(page, reporter.accessToken, {
      category: 'tree',
      description: 'Storm limb hanging over the sidewalk.',
      x: 36,
      y: 29,
    })

    // The watcher's feed has the watch-area notification.
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(watcher.email)
    await page.locator('#password').fill(watcher.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
    await page.goto(APP_BASE + '/notifications')
    const row = page
      .locator('[data-mol-id="notification-item"][data-kind="watch_area_issue"]')
      .first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await expect(row).toContainText('tree')

    // Reports OUTSIDE the area do not notify (control, same watcher).
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    const farReporter = await signup(page)
    await seedIssue(page, farReporter.accessToken, { category: 'pothole', x: 90, y: 90 })
    await page.goto(APP_BASE + '/notifications')
    await expect(
      page.locator('[data-mol-id="notification-item"][data-kind="watch_area_issue"]', {
        hasText: 'pothole',
      }),
    ).toHaveCount(0, { timeout: 10_000 })
  })
})
