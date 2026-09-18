import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  createProject,
  inviteTeamMember,
  listAlerts,
  listIssues,
  listProjects,
  readIssue,
  setIssueStatus,
  signup,
  uniqueEmail,
} from './_helpers.js'

/**
 * End-to-end journey of a brand new Faultline user. Every step must
 * persist real state in Postgres — a follow-up GET reflects the write,
 * the workspace survives reload, and the seeded demo data shows up
 * exactly where the UI claims it lives.
 */
test.describe('user journey: signup -> triage -> invite -> deploy', () => {
  test('walks the primary flow end to end', async ({ page }) => {
    // 1. Sign up.
    const { email, accessToken } = await signup(page, uniqueEmail('journey'))
    expect(accessToken).toBeTruthy()

    // 2. Land on /dashboard and confirm a seeded issue is there.
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    const issues = await listIssues(page)
    expect(issues.length, 'seed should provision issues').toBeGreaterThan(0)
    expect(await page.locator('body').innerText()).toContain(issues[0]!.title.split(':')[0]!)

    // 3. Triage one issue — Resolve it and confirm read-after-write.
    const target = issues.find((i) => i.status === 'unresolved') ?? issues[0]!
    await setIssueStatus(page, target.id, 'resolved')
    expect((await readIssue(page, target.id)).status).toBe('resolved')

    // 4. Spin up a brand new project for the user.
    const project = await createProject(page, { name: `Journey App ${Date.now()}` })
    expect(project.id).toBeTruthy()
    const projects = await listProjects(page)
    expect(
      projects.find((p) => p.id === project.id),
      'project visible in /projects-health',
    ).toBeTruthy()

    // 5. Invite a teammate.
    const inviteEmail = uniqueEmail('teammate')
    const invite = await inviteTeamMember(page, { email: inviteEmail, role: 'dev' })
    expect(invite.email).toBe(inviteEmail)
    await page.goto(APP_BASE + '/team')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('body').innerText()).toContain(inviteEmail)

    // 6. Visit /alerts, confirm seeded rules render.
    const alerts = await listAlerts(page)
    expect(alerts.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('body').innerText()).toContain(alerts[0]!.name)

    // 7. Profile page shows the user's email.
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('body').innerText()).toContain(email)

    // 8. Hard reload — every change still persists.
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect((await readIssue(page, target.id)).status, 'resolved status survives reload').toBe(
      'resolved',
    )
    const projectsAfter = await listProjects(page)
    expect(
      projectsAfter.find((p) => p.id === project.id),
      'project survives reload',
    ).toBeTruthy()
  })
})
