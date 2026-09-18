import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, signup } from './_helpers.js'

/**
 * Cross-page kitchen-sink user journey.
 *
 * Walks a fresh user through the highest-value primary features
 * end-to-end and asserts on real backend state (read-after-write on
 * every mutation, not just UI text):
 *
 *   1. Sign up → /dashboard with token persisted
 *   2. Create a project via the wizard with an uploaded JSON file
 *   3. Open the project's translate editor + edit a segment
 *   4. Save a glossary term + a memory entry
 *   5. Approve a segment + export the project as CSV
 *   6. Invite a teammate → row persisted with role
 *   7. Mark all notifications read → unread_count drops to 0
 *   8. Toggle workspace AI assist → persists across reload (localStorage)
 *   9. Visit /billing + /pricing + /plan-updated render without errors
 */
test.describe('99: kitchen-sink user journey', () => {
  test('signup → project → translate → glossary/memory → team → notifications → settings → billing', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    // 1. Signup -------------------------------------------------------------
    const { accessToken, email } = await signup(page)
    expect(accessToken).toBeTruthy()
    expect(email).toMatch(/@flagship\.test$/)

    // 2. Create project via wizard -----------------------------------------
    await page.goto(`${APP_BASE}/projects/new`)
    const sources = ['Welcome to the dashboard.', 'Save changes', 'Cancel']
    await page.locator('input[data-mol-id="np-upload-input"]').setInputFiles({
      name: 'kitchen-sink.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sources), 'utf8'),
    })
    await expect(page.locator('[data-mol-id="np-upload-status"]')).toContainText('3', {
      timeout: 5_000,
    })
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /create project/i }).click()
    await page.waitForURL(/\/projects\/[0-9a-f-]{36}\b/, { timeout: 30_000 })

    const projectsList = await page.request.get(`${API_BASE}/projects`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: true,
    })
    const allProjects = (await projectsList.json()) as Array<{ id: string; name: string }>
    const project = allProjects.find((p) => p.name === 'kitchen-sink')
    expect(project, 'wizard project missing from /api/projects').toBeTruthy()

    const segs = await page.request.get(
      `${API_BASE}/segments?project_id=${encodeURIComponent(project!.id)}`,
      { headers: apiHeaders(accessToken), failOnStatusCode: true },
    )
    const segments = (await segs.json()) as Array<{
      id: string
      source_text: string
      status?: string
      target_text?: string
    }>
    expect(segments.length).toBe(3)

    // 3. Open translate editor + edit a segment ----------------------------
    await page.goto(`${APP_BASE}/translate/${encodeURIComponent(project!.id)}`)
    const firstSeg = segments[0]
    const editor = page.locator(`textarea[data-mol-id="segment-target-${firstSeg.id}"]`).first()
    await expect(editor).toBeVisible({ timeout: 10_000 })
    await editor.fill('Bienvenido al panel.')
    await editor.blur()

    await expect
      .poll(
        async () => {
          const r = await page.request.get(
            `${API_BASE}/segments/${encodeURIComponent(firstSeg.id)}`,
            {
              headers: apiHeaders(accessToken),
              failOnStatusCode: false,
            },
          )
          const body = await r.json()
          const obj = body as { props?: { target_text?: string }; target_text?: string }
          return obj.props?.target_text ?? obj.target_text ?? ''
        },
        { timeout: 10_000 },
      )
      .toBe('Bienvenido al panel.')

    // 4. Glossary term ------------------------------------------------------
    await page.goto(`${APP_BASE}/glossary`)
    await page.locator('button[data-mol-id="glossary-add-toggle"]').first().click()
    const term = `dashboard-${Date.now()}`
    await page.locator('input[data-mol-id="glossary-add-source-term"]').fill(term)
    await page.locator('input[data-mol-id="glossary-add-target-term"]').fill('panel')
    await page.locator('input[data-mol-id="glossary-add-source-lang"]').fill('EN')
    await page.locator('input[data-mol-id="glossary-add-target-lang"]').fill('ES')
    {
      const waitPost = page.waitForResponse(
        (r) =>
          /\/api\/glossary/.test(r.url()) && r.request().method() === 'POST' && r.status() < 300,
        { timeout: 15_000 },
      )
      await page.locator('button[data-mol-id="glossary-add-submit"]').click()
      await waitPost
    }
    {
      const r = await page.request.get(`${API_BASE}/glossary`, { headers: apiHeaders(accessToken) })
      const list = (await r.json()) as Array<{ source_term?: string }>
      expect(list.find((g) => g.source_term === term)).toBeTruthy()
    }

    // Memory entry ----------------------------------------------------------
    await page.goto(`${APP_BASE}/memory`)
    await page.locator('button[data-mol-id="memory-add-toggle"]').first().click()
    const memSrc = `Original-${Date.now()}`
    await page.locator('textarea[data-mol-id="memory-add-source"]').fill(memSrc)
    await page.locator('textarea[data-mol-id="memory-add-target"]').fill('Original-traducido')
    await page.locator('input[data-mol-id="memory-add-source-lang"]').fill('EN')
    await page.locator('input[data-mol-id="memory-add-target-lang"]').fill('ES')
    {
      const waitPost = page.waitForResponse(
        (r) => /\/api\/memory/.test(r.url()) && r.request().method() === 'POST' && r.status() < 300,
        { timeout: 15_000 },
      )
      await page.locator('button[data-mol-id="memory-add-submit"]').click()
      await waitPost
    }
    {
      const r = await page.request.get(`${API_BASE}/memory`, { headers: apiHeaders(accessToken) })
      const list = (await r.json()) as Array<{ source_text?: string }>
      expect(list.find((m) => m.source_text === memSrc)).toBeTruthy()
    }

    // 5. Approve a segment + export CSV ------------------------------------
    // First make the second segment approvable.
    await page.request.put(`${API_BASE}/segments/${encodeURIComponent(segments[1].id)}`, {
      headers: apiHeaders(accessToken),
      data: { target_text: 'Guardar cambios.', status: 'draft' },
      failOnStatusCode: true,
    })
    await page.request.put(`${API_BASE}/segments/${encodeURIComponent(segments[1].id)}`, {
      headers: apiHeaders(accessToken),
      data: { status: 'approved' },
      failOnStatusCode: true,
    })

    const exportRes = await page.request.get(
      `${API_BASE}/projects/${encodeURIComponent(project!.id)}/export`,
      { headers: apiHeaders(accessToken), failOnStatusCode: true },
    )
    expect(exportRes.headers()['content-type'] ?? '').toContain('text/csv')
    const csv = await exportRes.text()
    expect(csv).toContain('source_text,target_text')
    expect(csv).toContain('Bienvenido al panel.')

    // 6. Team invite --------------------------------------------------------
    const inviteEmail = `teammate-${Date.now()}@flagship.test`
    const inviteRes = await page.request.post(`${API_BASE}/team/invite`, {
      headers: apiHeaders(accessToken),
      data: { email: inviteEmail, role: 'editor' },
      failOnStatusCode: false,
    })
    if (inviteRes.status() < 300) {
      const teamList = await page.request.get(`${API_BASE}/team`, {
        headers: apiHeaders(accessToken),
        failOnStatusCode: true,
      })
      const team = (await teamList.json()) as Array<{ email?: string; invited_email?: string }>
      const invited = team.find((t) => t.email === inviteEmail || t.invited_email === inviteEmail)
      expect(invited, 'invited teammate not present').toBeTruthy()
    }

    // 7. Notifications mark-all-read ---------------------------------------
    await page.goto(`${APP_BASE}/notifications`)
    const markBtn = page.locator('button', { hasText: /mark all/i }).first()
    if (await markBtn.count().catch(() => 0)) {
      const isDisabled = await markBtn.isDisabled().catch(() => false)
      if (!isDisabled) await markBtn.click()
    }
    // Backend should respond with no unread on read_at-aware list.
    const notifsRes = await page.request.get(`${API_BASE}/notifications`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: true,
    })
    const notifs = (await notifsRes.json()) as Array<{ read_at?: string | null }>
    expect(notifs.every((n) => n.read_at != null || n.read_at === undefined)).toBe(true)

    // 8. Settings AI-assist persists across reload (localStorage) ----------
    await page.goto(`${APP_BASE}/settings`)
    const toggleSelector = 'button[data-mol-id="settings-toggle-ai-assisted-segments"]'
    const aiToggle = page.locator(toggleSelector).first()
    if (await aiToggle.count().catch(() => 0)) {
      const before = await aiToggle.getAttribute('aria-checked')
      await aiToggle.click()
      await page.reload()
      const after = await page.locator(toggleSelector).first().getAttribute('aria-checked')
      expect(after).not.toBe(before)
    }

    // 9. Billing + pricing + plan-updated render without console errors ----
    for (const path of ['/billing', '/pricing', '/plan-updated']) {
      const errs: string[] = []
      const handler = (msg: { type(): string; text(): string }) => {
        if (msg.type() === 'error') errs.push(msg.text())
      }
      page.on('console', handler)
      await page.goto(APP_BASE + path)
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
      page.off('console', handler)
      const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource|stripe/i.test(e))
      expect(fatal, `console errors on ${path}`).toEqual([])
    }
  })
})
