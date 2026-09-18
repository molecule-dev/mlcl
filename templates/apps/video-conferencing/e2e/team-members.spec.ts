import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { api, signup } from './_helpers.js'

test.describe('team members', () => {
  test('signup auto-creates a workspace which appears on /team-members', async ({ page }) => {
    await signup(page, undefined, 'TestPass123!', 'Owen', 'Kim', 'Owen Lab')
    await page.goto('/team-members')
    await expect(page.getByTestId('member-count')).toContainText(/\d+ member/i)
  })

  test('owner appears in workspace_members list with role=owner', async ({ page }) => {
    await signup(page, undefined, 'TestPass123!', 'Maya', 'Reyes', 'Maya Studio')
    const workspaces = await api<Array<{ id: string }>>(page, 'GET', '/workspaces')
    const ws = workspaces[0]
    expect(ws).toBeTruthy()
    const members = await api<Array<{ role: string }>>(page, 'GET', `/workspace-members/${ws.id}`)
    expect(members.some((m) => m.role === 'owner')).toBe(true)
  })

  test('inviting a non-existent email succeeds (mail send is best-effort)', async ({ page }) => {
    await signup(page, undefined, 'TestPass123!', 'Inv', 'Iter', 'Inviter Workspace')
    await page.goto('/team-members')
    await page.getByTestId('open-invite').click()
    await page.getByTestId('invite-member-form').waitFor()
    await page.getByLabel('Invite email').fill('newperson@example.com')
    await page.getByTestId('submit-invite-member').click()
    await expect(page.getByTestId('invite-success')).toBeVisible({ timeout: 10_000 })
  })
})
