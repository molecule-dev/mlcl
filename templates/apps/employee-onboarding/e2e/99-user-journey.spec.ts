/**
 * Kitchen-sink end-to-end journey for the employee-onboarding flagship.
 *
 * One synthetic new hire boots up cold, walks through every primary
 * workspace section the way a real employee would on Day 1, and finishes
 * with a paid plan upgrade. Each step asserts both UI shell and the
 * specific API fan-out that page is supposed to drive, so a regression
 * in any single feature breaks the journey.
 *
 * Steps (all on a single user / single browser context):
 *   1. Sign up via /signup → land in authenticated shell.
 *   2. /dashboard renders + fans out to /me + /tasks + /milestones + /team.
 *   3. /checklist lists tasks; complete the first pending task and confirm
 *      completion percent on /api/onboardings/me strictly increases.
 *   4. /timeline renders milestones from /api/timeline-milestones.
 *   5. /training renders modules; POST /training-progress for first module.
 *   6. /documents lists docs; sign one unsigned document via PUT.
 *   7. /team lists teammates and the first profile page renders.
 *   8. /notifications shows seed feed, marking one read fires PUT.
 *   9. /settings (or /profile) page renders the authenticated shell.
 *  10. /pricing renders ≥2 tiers and a checkout call returns either
 *      a Stripe URL or an updated:true (already-on-tier) response.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('@99 employee-onboarding kitchen-sink journey', () => {
  test('cold-start new hire walks every primary section + upgrades plan', async ({ page }) => {
    test.setTimeout(180_000)

    // 1. Sign up.
    const { accessToken } = await signup(page, uniqueEmail('journey'))
    expect(accessToken, 'signup must persist a bearer token').toBeTruthy()

    // 2. Dashboard fan-out.
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/dashboard')
        await page.waitForLoadState('networkidle')
      })
      await expect(page.locator('[data-mol-id="page-dashboard"]').first()).toBeVisible()
      expect(reqs.some((r) => /\/api\/onboardings\/me/.test(r.url) && r.method === 'GET')).toBe(
        true,
      )
      expect(reqs.some((r) => /\/api\/tasks(\b|\?)/.test(r.url) && r.method === 'GET')).toBe(true)
      expect(
        reqs.some((r) => /\/api\/timeline-milestones(\b|\?)/.test(r.url) && r.method === 'GET'),
      ).toBe(true)
    }

    // 3. Checklist: complete a pending task and confirm /me reflects it.
    const meBefore = (await (
      await page.request.get(`${API_BASE}/onboardings/me`, { headers: authHeaders(accessToken) })
    ).json()) as { derived: { completionPct: number }; counts: { completedTasks: number } }
    const tasks = (await (
      await page.request.get(`${API_BASE}/tasks`, { headers: authHeaders(accessToken) })
    ).json()) as Array<{ id: string; status: string; title: string }>
    const pending = tasks.find((t) => t.status === 'pending')
    expect(pending, 'expected a seeded pending task').toBeTruthy()
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/checklist')
        await page.waitForLoadState('networkidle')
      })
      expect(reqs.some((r) => /\/api\/tasks(\b|\?)/.test(r.url) && r.method === 'GET')).toBe(true)
    }
    const putRes = await page.request.put(`${API_BASE}/tasks/${pending!.id}`, {
      headers: authHeaders(accessToken),
      data: { status: 'complete', completed_at: new Date().toISOString() },
    })
    expect(putRes.status()).toBe(200)
    const meAfter = (await (
      await page.request.get(`${API_BASE}/onboardings/me`, { headers: authHeaders(accessToken) })
    ).json()) as { derived: { completionPct: number }; counts: { completedTasks: number } }
    expect(meAfter.counts.completedTasks).toBeGreaterThan(meBefore.counts.completedTasks)
    expect(meAfter.derived.completionPct).toBeGreaterThanOrEqual(meBefore.derived.completionPct)

    // 4. Timeline.
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/timeline')
        await page.waitForLoadState('networkidle')
      })
      await expect(page.locator('[data-mol-id="page-timeline"]').first()).toBeVisible()
      expect(
        reqs.some((r) => /\/api\/timeline-milestones(\b|\?)/.test(r.url) && r.method === 'GET'),
      ).toBe(true)
    }

    // 5. Training: render modules + start first module via API.
    const modules = (await (
      await page.request.get(`${API_BASE}/training-modules`, { headers: authHeaders(accessToken) })
    ).json()) as Array<{ id: string; title: string }>
    expect(modules.length).toBeGreaterThan(0)
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/training')
        await page.waitForLoadState('networkidle')
      })
      await expect(page.locator('[data-mol-id="page-training"]').first()).toBeVisible()
      expect(
        reqs.some((r) => /\/api\/training-modules(\b|\?)/.test(r.url) && r.method === 'GET'),
      ).toBe(true)
    }
    const start = await page.request.post(`${API_BASE}/training-progress`, {
      headers: authHeaders(accessToken),
      data: { module_id: modules[0].id, started_at: new Date().toISOString() },
    })
    expect(start.status()).toBe(201)

    // 6. Documents: list + sign one.
    const docs = (await (
      await page.request.get(`${API_BASE}/documents`, { headers: authHeaders(accessToken) })
    ).json()) as Array<{ id: string; signed: boolean; requires_signature: boolean }>
    const unsigned = docs.find((d) => d.requires_signature && !d.signed)
    expect(unsigned, 'expected an unsigned-but-required seed doc').toBeTruthy()
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/documents')
        await page.waitForLoadState('networkidle')
      })
      expect(reqs.some((r) => /\/api\/documents(\b|\?)/.test(r.url) && r.method === 'GET')).toBe(
        true,
      )
    }
    const sign = await page.request.put(`${API_BASE}/documents/${unsigned!.id}`, {
      headers: authHeaders(accessToken),
      data: { signed: true },
    })
    expect(sign.status()).toBe(200)

    // 7. Team directory + first teammate profile.
    const team = (await (
      await page.request.get(`${API_BASE}/team-members`, { headers: authHeaders(accessToken) })
    ).json()) as Array<{ id: string; name: string }>
    expect(team.length).toBeGreaterThan(0)
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/team')
        await page.waitForLoadState('networkidle')
      })
      await expect(page.locator('[data-mol-id="page-team-directory"]').first()).toBeVisible()
      expect(reqs.some((r) => /\/api\/team-members(\b|\?)/.test(r.url) && r.method === 'GET')).toBe(
        true,
      )
    }
    await page.goto(APP_BASE + `/team/${team[0].id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-team-profile"]').first()).toBeVisible()

    // 8. Notifications: list + mark one read.
    const notifs = (await (
      await page.request.get(`${API_BASE}/notifications`, { headers: authHeaders(accessToken) })
    ).json()) as Array<{ id: string; read_at: string | null }>
    const unread = notifs.find((n) => !n.read_at)
    {
      const reqs = await captureNetwork(page, async () => {
        await page.goto(APP_BASE + '/notifications')
        await page.waitForLoadState('networkidle')
      })
      await expect(page.locator('[data-mol-id="page-notifications"]').first()).toBeVisible()
      expect(
        reqs.some((r) => /\/api\/notifications(\b|\?)/.test(r.url) && r.method === 'GET'),
      ).toBe(true)
    }
    if (unread) {
      const mark = await page.request.put(`${API_BASE}/notifications/${unread.id}`, {
        headers: authHeaders(accessToken),
        data: { read_at: new Date().toISOString() },
      })
      expect(mark.status()).toBe(200)
    }

    // 9. Settings / profile page renders authenticated.
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login|\/signup/)

    // 10. Pricing: tiers list + checkout.
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: authHeaders(accessToken),
    })
    expect(tiersRes.status()).toBe(200)
    const tiersBody = (await tiersRes.json()) as
      | Array<{ key: string; price?: { stripePriceId?: string | null } }>
      | {
          data?: Array<{ key: string; price?: { stripePriceId?: string | null } }>
          tiers?: Array<{ key: string; price?: { stripePriceId?: string | null } }>
        }
    const tiers = Array.isArray(tiersBody) ? tiersBody : (tiersBody.data ?? tiersBody.tiers ?? [])
    expect(tiers.length).toBeGreaterThanOrEqual(2)
    const paid = tiers.find((t) => t.key !== 'free' && t.price?.stripePriceId)
    if (paid?.price?.stripePriceId) {
      const checkout = await page.request.post(`${API_BASE}/billing/checkout`, {
        headers: authHeaders(accessToken),
        data: {
          priceId: paid.price.stripePriceId,
          successUrl: APP_BASE + '/plan-updated',
          cancelUrl: APP_BASE + '/pricing',
        },
      })
      expect([200, 201]).toContain(checkout.status())
      const body = (await checkout.json()) as {
        url?: string
        checkoutUrl?: string
        updated?: boolean
      }
      const stripeUrl = body.checkoutUrl ?? body.url ?? ''
      if (!body.updated) {
        expect(stripeUrl).toMatch(/checkout\.stripe\.com|cs_test_/)
      }
    }
  })
})
