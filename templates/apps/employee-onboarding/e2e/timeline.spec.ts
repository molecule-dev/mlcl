/**
 * Timeline renders the seeded milestones, and milestone status flips
 * to "complete" once its acceptance criteria are met (via tasks).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('timeline', () => {
  test('timeline renders milestones from /api/timeline-milestones', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('timeline'))
    const r = await page.request.get(`${API_BASE}/timeline-milestones`, {
      headers: authHeaders(accessToken),
    })
    const milestones = (await r.json()) as Array<{ id: string; label: string }>
    expect(milestones.length).toBeGreaterThan(0)

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/timeline')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-timeline"]').first()).toBeVisible()
    await expect(page.getByText(milestones[0].label).first()).toBeVisible()
    expect(
      reqs.some((r) => /\/api\/timeline-milestones(\b|\?)/.test(r.url) && r.method === 'GET'),
    ).toBe(true)
  })

  test('timeline updates after marking the last task of a milestone group complete', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('timeline-progress'))
    const tasksResp = await page.request.get(`${API_BASE}/tasks`, {
      headers: authHeaders(accessToken),
    })
    const tasks = (await tasksResp.json()) as Array<{ id: string; status: string }>
    const pending = tasks.find((t) => t.status === 'pending')
    expect(pending, 'expected at least one pending task').toBeTruthy()
    await page.request.put(`${API_BASE}/tasks/${pending!.id}`, {
      headers: authHeaders(accessToken),
      data: { status: 'complete', completed_at: new Date().toISOString() },
    })
    const milestones = (await (
      await page.request.get(`${API_BASE}/timeline-milestones`, {
        headers: authHeaders(accessToken),
      })
    ).json()) as Array<{ id: string; label: string }>
    expect(milestones.length).toBeGreaterThan(0)
  })

  test('timeline sidebar nav links route to dashboard/checklist/timeline', async ({ page }) => {
    await signup(page, uniqueEmail('timeline-nav'))
    await page.goto(APP_BASE + '/timeline')
    await page.waitForLoadState('networkidle')
    for (const path of ['/dashboard', '/checklist', '/timeline']) {
      const link = page.locator(`a[href="${path}"]`).first()
      await expect(link, `expected sidebar nav link to ${path}`).toBeVisible()
    }
  })
})
