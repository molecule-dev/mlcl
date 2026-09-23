import { APP_BASE, signup } from './_helpers.js'
import { expect, test } from '@molecule/app-e2e-fixtures-default'

/**
 * 09: mobile shell — the template-local compact shell below 768px (sticky
 * timer header + hamburger drawer). The desktop specs run at the default
 * 1280px viewport and never mount this shell, so these tests pin its
 * contract at 390×844: drawer navigation with close-on-route-change,
 * 44px+ tap targets on the timer controls, and no horizontal overflow.
 */

const MOBILE = { width: 390, height: 844 } as const

test.describe('09: mobile shell — drawer nav + sticky timer at 390px', () => {
  test('drawer opens, reaches every section, and closes on navigation', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await signup(page)
    await expect(page.locator('[data-test=mobile-nav-toggle]')).toBeVisible()
    // Exactly ONE shell mounts at a time — the desktop sidebar (with its
    // sign-out button) must not render below 768px.
    await expect(page.locator('[data-test=sign-out]')).toHaveCount(0)

    const drawer = page.locator('#mobile-nav-drawer')
    const toggle = page.locator('[data-test=mobile-nav-toggle]')
    await toggle.click()
    await expect(drawer).toBeVisible()

    // Every work section is reachable from the drawer; the drawer closes
    // whenever the route changes.
    for (const [label, path] of [
      ['Time Entries', '/entries'],
      ['Timesheet', '/timesheet'],
      ['Projects', '/projects'],
      ['Clients', '/clients'],
      ['Reports', '/reports'],
      ['Invoices', '/invoices'],
    ] as const) {
      await drawer.getByRole('link', { name: label }).click()
      await expect(drawer).not.toBeVisible()
      await expect(page).toHaveURL(
        new RegExp(`${APP_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${path}$`),
      )
      await toggle.click()
      await expect(drawer).toBeVisible()
    }

    // Sign-out lives in the drawer's account block on mobile.
    await expect(drawer.locator('[data-test=sign-out]')).toBeVisible()
  })

  test('timer start/stop from the header: elapsed ticks, entry lands in the list, 44px tap targets', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE)
    await signup(page)

    await page.locator('[data-test=timer-description]').fill('Mobile probe session')
    const toggle = page.locator('[data-test=timer-toggle]')
    const box = await toggle.boundingBox()
    expect(box, 'timer button renders with a box').not.toBeNull()
    expect(box!.height, 'timer button is a touch target').toBeGreaterThanOrEqual(44)

    await toggle.click()
    await expect(page.locator('[data-test=timer-elapsed]')).not.toHaveText('00:00:00', {
      timeout: 10000,
    })
    await expect(toggle).toBeEnabled()
    await toggle.click() // stop
    await expect(page.getByText('Mobile probe session').first()).toBeVisible({ timeout: 10000 })

    // No horizontal overflow anywhere on the entries list while the header
    // is mounted (390px scroll width).
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(390)
  })
})
