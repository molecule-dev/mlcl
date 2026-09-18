import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { signup, seedBoard, captureNetwork, APP_BASE } from './_helpers'

test.describe('profile — public collaborator card', () => {
  test('renders user name and counts', async ({ page }) => {
    const { firstName } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      const name = page.locator('[data-mol-id="profile-name"]')
      await expect(name).toBeVisible()
      await expect(name).toContainText(firstName)
      await expect(page.locator('[data-mol-id="profile-stats"]')).toBeVisible()
      await expect(page.locator('[data-mol-id="profile-empty-boards"]')).toBeVisible()
    })
    expect(
      reqs.some(
        (r) => r.method === 'GET' && /\/api\/(?:users\/me|boards)/.test(r.url) && r.status < 400,
      ),
      `profile must hydrate from /api/users/me or /api/boards — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
  })

  test('boards count reflects API state', async ({ page }) => {
    await signup(page)
    await seedBoard(page, { title: 'Pub one', is_public: true })
    await seedBoard(page, { title: 'Priv one' })
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-stat-boards"]')).toContainText('2')
    await expect(page.locator('[data-mol-id="profile-stat-publicBoards"]')).toContainText('1')
    await expect(page.locator('[data-mol-id="profile-stat-privateBoards"]')).toContainText('1')
    await expect(page.locator('[data-mol-id="profile-board-grid"]')).toBeVisible()
  })

  test('cursor color picker persists to localStorage', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-color-a855f7"]').click()
    const stored = await page.evaluate(() => window.localStorage.getItem('whiteboard:cursorColor'))
    expect(stored).toBe('#a855f7')
    await page.reload()
    const after = await page.evaluate(() => window.localStorage.getItem('whiteboard:cursorColor'))
    expect(after).toBe('#a855f7')
  })

  test('"Edit profile" link navigates to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-edit-link"]').click()
    await expect(page).toHaveURL(/\/settings/)
  })
})
