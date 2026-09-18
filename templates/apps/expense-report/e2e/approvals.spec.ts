import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getPendingApprovals, signup } from './_helpers.js'

test.describe('/approvals page', () => {
  test('Recoup brand link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await expect(page.getByRole('link', { name: /recoup/i }).first()).toBeVisible()
  })

  test('Sidebar Dashboard link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await page.locator('a[href="/dashboard"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })

  test('Sidebar Expenses link routes to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await page.locator('a[href="/expenses"]').first().click()
    await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 5000 })
  })

  test('Sidebar Reports link routes to /reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await page.locator('aside a[href="/reports"], nav a[href="/reports"]').first().click()
    await page.waitForURL(/\/reports($|\?|\/)/, { timeout: 5000 })
  })

  test('Sidebar Report Library link routes to /reports/list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await page.locator('a[href="/reports/list"]').first().click()
    await page.waitForURL('**/reports/list', { timeout: 5000 })
  })

  test('Sidebar Approvals link is the active route', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await expect(page.locator('a[href="/approvals"]').first()).toBeVisible()
  })

  test('Activity link routes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await page.locator('a[href="/notifications"]').first().click()
    await page.waitForURL('**/notifications', { timeout: 5000 })
  })

  test('Settings link routes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await page.locator('a[href="/settings"]').first().click()
    await page.waitForURL('**/settings', { timeout: 5000 })
  })

  test('Open user menu opens a menu with sign out', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await menu.click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible({
      timeout: 4000,
    })
  })

  test('the first queued report renders its title as a link', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Read the queue from the API — naming a demo report breaks this the
    // moment the queue holds the owner's own data.
    const queue = await getPendingApprovals(page, accessToken)
    const first = queue[0]
    if (!first) throw new Error('the approvals queue is empty')
    await page.goto(APP_BASE + '/approvals')
    await expect(page.getByRole('link', { name: first.title, exact: false }).first()).toBeVisible()
  })

  test('Review link routes to a /reports detail with id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    const review = page.getByRole('link', { name: /review/i }).first()
    if (await review.count().catch(() => 0)) {
      await review.click()
      await page.waitForURL(/\/reports\?id=[\w-]+/, { timeout: 5000 })
    }
  })

  test('Reject button on a queue item posts to /api/approvals/:id/reject', async ({ page }) => {
    await signup(page)
    // The Reject handler uses window.prompt() to ask for a reason; Playwright
    // dismisses prompts by default, which makes the handler return without
    // POSTing. Accept the dialog with a real reason so we can verify the call.
    page.on('dialog', (dialog) => {
      if (dialog.type() === 'prompt') void dialog.accept('e2e: out of policy')
      else void dialog.accept()
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/approvals')
      await page.waitForLoadState('networkidle')
      const reject = page.getByRole('button', { name: /^reject$/i }).first()
      if (await reject.count().catch(() => 0)) {
        await reject.click()
        await page.waitForTimeout(1200)
      }
    })
    const call = reqs.find(
      (r) => r.method === 'POST' && /\/api\/approvals\/[\w-]+\/reject/.test(r.url),
    )
    expect(call, 'POST /api/approvals/:id/reject').toBeTruthy()
  })

  test('Approve button on a queue item posts to /api/approvals/:id/approve', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/approvals')
      await page.waitForLoadState('networkidle')
      const approve = page.getByRole('button', { name: /^approve$/i }).first()
      if (await approve.count().catch(() => 0)) {
        await approve.click()
        await page.waitForTimeout(800)
      }
    })
    const call = reqs.find(
      (r) => r.method === 'POST' && /\/api\/approvals\/[\w-]+\/approve/.test(r.url),
    )
    expect(call, 'POST /api/approvals/:id/approve').toBeTruthy()
  })

  test('a second queued report renders its title as a link too', async ({ page }) => {
    const { accessToken } = await signup(page)
    const queue = await getPendingApprovals(page, accessToken)
    const second = queue[1]
    if (!second) throw new Error('the approvals queue holds fewer than two reports')
    await page.goto(APP_BASE + '/approvals')
    await expect(page.getByRole('link', { name: second.title, exact: false }).first()).toBeVisible()
  })

  test('About Recoup link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/approvals')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })

  test('hits /api/approvals on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/approvals')
      await page.waitForLoadState('networkidle')
    })
    const call = reqs.find((r) => r.method === 'GET' && /\/api\/approvals/.test(r.url))
    expect(call, 'GET /api/approvals').toBeTruthy()
    expect(call?.status).toBeLessThan(400)
  })
})
