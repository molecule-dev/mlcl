/**
 * ResponsiveAppShell — the shared shell ShiftlyLayout adopted.
 *
 * Mobile (<768px): the shell's `shell-drawer-open` trigger opens the nav
 * Drawer (APG dialog); Escape closes it; a nav click navigates AND closes
 * it. Desktop (>=768px): the Sidebar carries the same `nav-*` links, the
 * active item is marked `aria-current="page"`, and no drawer chrome exists.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('responsive shell', () => {
  test('mobile: trigger opens the drawer, Escape closes, nav click navigates and closes', async ({
    page,
  }) => {
    await signup(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(APP_BASE + '/dashboard')

    const trigger = page.getByRole('button', { name: /open navigation menu/i })
    await expect(trigger).toBeVisible()
    // The desktop sidebar is not mounted below the breakpoint.
    await expect(page.locator('[data-mol-id="shell-sidebar"]')).toHaveCount(0)

    await trigger.click()
    const drawer = page.locator('[data-mol-id="shell-drawer"]')
    await expect(drawer).toBeVisible()
    await expect(drawer.locator('[data-mol-id="nav-settings"]')).toBeVisible()

    // Escape closes (dialog contract).
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)

    // A nav click navigates and closes the drawer on route change.
    await trigger.click()
    await expect(drawer).toBeVisible()
    await drawer.locator('[data-mol-id="nav-settings"]').click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(drawer).toHaveCount(0)
  })

  test('desktop: sidebar carries the nav, active item marked, no drawer chrome', async ({
    page,
  }) => {
    await signup(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(APP_BASE + '/dashboard')

    const sidebar = page.locator('[data-mol-id="shell-sidebar"]')
    await expect(sidebar).toBeVisible()
    const dashboardLink = sidebar.locator('[data-mol-id="nav-dashboard"]')
    await expect(dashboardLink).toBeVisible()
    await expect(dashboardLink).toHaveAttribute('aria-current', 'page')
    await expect(sidebar.locator('[data-mol-id="nav-timesheets"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="shell-drawer-open"]')).toHaveCount(0)
  })
})
