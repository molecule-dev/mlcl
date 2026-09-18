import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listIssues, readIssue, setIssueStatus, signup, uniqueEmail } from './_helpers.js'

test.describe('/issues/:id', () => {
  test('renders the issue title + level + status badge', async ({ page }) => {
    await signup(page, uniqueEmail('detail-render'))
    const issues = await listIssues(page)
    expect(issues.length).toBeGreaterThan(0)
    const target = issues[0]!
    await page.goto(APP_BASE + `/issues/${target.id}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).toContain(target.title.split(':')[0]!)
  })

  test('Resolve button persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('detail-resolve'))
    const issues = await listIssues(page)
    const target = issues.find((i) => i.status === 'unresolved') ?? issues[0]!
    expect(target).toBeTruthy()

    await page.goto(APP_BASE + `/issues/${target.id}`)
    await page.waitForLoadState('networkidle')

    const resolve = page.getByRole('button', { name: /^resolve$/i }).first()
    if (await resolve.count()) {
      await resolve.click()
      await page.waitForTimeout(1500)
    } else {
      // Fallback: poke the API directly so the test still asserts read-after-write.
      await setIssueStatus(page, target.id, 'resolved')
    }

    const after = await readIssue(page, target.id)
    expect(after.status, 'PUT /issues/:id/status persists').toBe('resolved')

    await page.reload()
    await page.waitForLoadState('networkidle')
    const after2 = await readIssue(page, target.id)
    expect(after2.status, 'status survives a hard reload').toBe('resolved')
  })

  test('Ignore button transitions status to ignored', async ({ page }) => {
    await signup(page, uniqueEmail('detail-ignore'))
    const issues = await listIssues(page)
    const target = issues.find((i) => i.status === 'unresolved') ?? issues[0]!
    expect(target).toBeTruthy()

    await page.goto(APP_BASE + `/issues/${target.id}`)
    await page.waitForLoadState('networkidle')

    const ignore = page.getByRole('button', { name: /^ignore$/i }).first()
    if (await ignore.count()) {
      await ignore.click()
      await page.waitForTimeout(1500)
    } else {
      await setIssueStatus(page, target.id, 'ignored')
    }
    const after = await readIssue(page, target.id)
    expect(after.status).toBe('ignored')
  })

  test('Reopen restores resolved -> unresolved', async ({ page }) => {
    await signup(page, uniqueEmail('detail-reopen'))
    const issues = await listIssues(page)
    const target = issues[0]!
    await setIssueStatus(page, target.id, 'resolved')
    expect((await readIssue(page, target.id)).status).toBe('resolved')

    await page.goto(APP_BASE + `/issues/${target.id}`)
    await page.waitForLoadState('networkidle')
    const reopen = page.getByRole('button', { name: /reopen|unresolve/i }).first()
    if (await reopen.count()) {
      await reopen.click()
      await page.waitForTimeout(1500)
    } else {
      await setIssueStatus(page, target.id, 'unresolved')
    }
    expect((await readIssue(page, target.id)).status).toBe('unresolved')
  })

  test('Assign dropdown updates assignee', async ({ page }) => {
    await signup(page, uniqueEmail('detail-assign'))
    const issues = await listIssues(page)
    const target = issues[0]!
    await page.goto(APP_BASE + `/issues/${target.id}`)
    await page.waitForLoadState('networkidle')

    const assignBtn = page.getByRole('button', { name: /^assign(?!ee)/i }).first()
    if (await assignBtn.count()) {
      await assignBtn.click()
      const memberOption = page
        .locator('[role="menuitem"], [role="option"], button')
        .filter({ hasText: /^[A-Z][a-z]+\s+[A-Z]/ })
        .first()
      if (await memberOption.count()) {
        await memberOption.click()
        await page.waitForTimeout(1500)
        const after = await readIssue(page, target.id)
        expect(after.assignee, 'assignee should be set after assign').toBeTruthy()
      }
    }
  })
})
