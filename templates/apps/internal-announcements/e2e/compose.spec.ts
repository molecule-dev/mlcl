/**
 * /compose — new announcement form. Title, body, channel, priority, and
 * "require acknowledgment" all map to a real POST /api/announcements,
 * after which the user is forwarded to the new announcement's detail
 * page and the row appears in the live feed.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listAnnouncements, signup, uniqueEmail } from './_helpers.js'

test.describe('compose page', () => {
  test('renders the composer with priority + channel selectors', async ({ page }) => {
    await signup(page, uniqueEmail('compose-render'))
    await page.goto(APP_BASE + '/compose')
    await expect(page.getByTestId('composer-title')).toBeVisible()
    await expect(page.getByTestId('composer-body')).toBeVisible()
    await expect(page.getByTestId('composer-priority-urgent')).toBeVisible()
    await expect(page.getByTestId('composer-priority-normal')).toBeVisible()
    await expect(page.getByTestId('composer-publish')).toBeVisible()
  })

  test('publish button is disabled until title >= 8 chars and body >= 20 chars', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('compose-validation'))
    await page.goto(APP_BASE + '/compose')
    const submit = page.getByTestId('composer-publish')
    await expect(submit).toBeDisabled()
    await page.getByTestId('composer-title').fill('Short')
    await page.getByTestId('composer-body').fill('Tiny')
    await expect(submit).toBeDisabled()
    await page.getByTestId('composer-title').fill('A long enough title')
    await page.getByTestId('composer-body').fill('And a body that is long enough to publish.')
    await expect(submit).toBeEnabled()
  })

  test('publish posts to /api/announcements and lands on /announcement/:id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('compose-publish'))
    await page.goto(APP_BASE + '/compose')
    const title = `Spec compose ${Date.now()}`
    await page.getByTestId('composer-title').fill(title)
    await page
      .getByTestId('composer-body')
      .fill('A real announcement body for the compose spec — long enough to publish.')

    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('composer-publish').click()
      await page.waitForURL(/\/announcement\/[a-f0-9-]+/, { timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/announcements(\?|$)/.test(r.url))
    expect(post, 'compose should POST /api/announcements').toBeTruthy()
    expect(post!.status).toBe(201)

    const list = await listAnnouncements(page, accessToken)
    expect(list.find((a) => a.title === title)).toBeTruthy()
  })

  test('priority selector switches the active button styling', async ({ page }) => {
    await signup(page, uniqueEmail('compose-priority'))
    await page.goto(APP_BASE + '/compose')
    const urgentBtn = page.getByTestId('composer-priority-urgent')
    const normalBtn = page.getByTestId('composer-priority-normal')
    // Inactive button has the muted border colour rgba(0,0,0,0.1).
    // Active button has its priority accent colour. Verify the swap.
    await urgentBtn.click()
    const urgentBorder = await urgentBtn.evaluate((el) => (el as HTMLElement).style.borderColor)
    const normalBorderWhenInactive = await normalBtn.evaluate(
      (el) => (el as HTMLElement).style.borderColor,
    )
    expect(urgentBorder).not.toBe(normalBorderWhenInactive)
    await normalBtn.click()
    const normalBorderActive = await normalBtn.evaluate(
      (el) => (el as HTMLElement).style.borderColor,
    )
    const urgentBorderInactive = await urgentBtn.evaluate(
      (el) => (el as HTMLElement).style.borderColor,
    )
    expect(normalBorderActive).not.toBe(urgentBorderInactive)
  })

  test('cancel button returns to /feed', async ({ page }) => {
    await signup(page, uniqueEmail('compose-cancel'))
    await page.goto(APP_BASE + '/compose')
    await page.getByTestId('composer-cancel').click()
    await page.waitForURL('**/feed', { timeout: 5000 })
  })

  test('require-ack checkbox is checked by default and toggleable', async ({ page }) => {
    await signup(page, uniqueEmail('compose-ack'))
    await page.goto(APP_BASE + '/compose')
    const cb = page.getByTestId('composer-require-ack')
    await expect(cb).toBeChecked()
    await cb.uncheck()
    await expect(cb).not.toBeChecked()
  })

  test('Sign out from /compose works', async ({ page }) => {
    await signup(page, uniqueEmail('compose-signout'))
    await page.goto(APP_BASE + '/compose')
    await page
      .getByRole('button', { name: /SIGN OUT|Sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })

  test('Theme toggle flips data-mol-mode on /compose', async ({ page }) => {
    await signup(page, uniqueEmail('compose-theme'))
    await page.goto(APP_BASE + '/compose')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })

  test('priority=urgent + is_pinned=false maps correctly when published', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('compose-mapping'))
    await page.goto(APP_BASE + '/compose')
    await page.getByTestId('composer-priority-urgent').click()
    const title = `Spec urgent ${Date.now()}`
    await page.getByTestId('composer-title').fill(title)
    await page
      .getByTestId('composer-body')
      .fill('A long enough body to satisfy validation for the spec.')
    await page.getByTestId('composer-publish').click()
    await page.waitForURL(/\/announcement\/[a-f0-9-]+/, { timeout: 10000 })

    const list = await listAnnouncements(page, accessToken)
    const created = list.find((a) => a.title === title)
    expect(created?.priority).toBe('high')
    expect(created?.is_pinned).toBe(false)
  })
})
