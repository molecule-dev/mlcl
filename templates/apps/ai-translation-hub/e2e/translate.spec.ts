import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedProject,
  seedSegment,
  signup,
} from './_helpers.js'

test.describe('translate: editor read-after-write', () => {
  test('typing into a segment persists across reload (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken, {
      source_lang: 'EN',
      target_langs: ['ES'],
    })
    const seg = await seedSegment(page, accessToken, {
      project_id: project.id,
      source_text: 'Hello, world.',
      source_lang: 'EN',
      target_lang: 'ES',
      position: 0,
    })

    // Capture every backend call the editor fires while we type and blur,
    // so we can assert on the GET fan-out (projects/segments/memory/glossary)
    // promised by e2e/observations/translate.md.
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/translate/${encodeURIComponent(project.id)}`)
      const editor = page.locator(`textarea[data-mol-id="segment-target-${seg.id}"]`).first()
      await expect(editor).toBeVisible()
      const waitPut = page.waitForResponse(
        (r) =>
          /\/api\/segments\//.test(r.url()) && r.request().method() === 'PUT' && r.status() < 300,
        { timeout: 15_000 },
      )
      await editor.fill('Hola, mundo.')
      await editor.blur()
      await waitPut
    })
    expect(
      reqs.find((r) => /\/api\/projects(?:\?|\/|$)/.test(r.url) && r.method === 'GET'),
    ).toBeDefined()
    expect(
      reqs.find((r) => /\/api\/segments(?:\?|\/|$)/.test(r.url) && r.method === 'GET'),
    ).toBeDefined()
    expect(reqs.find((r) => /\/api\/segments\//.test(r.url) && r.method === 'PUT')).toBeDefined()

    // Backend round-trip: refetch the segment via the JSON API.
    await expect
      .poll(
        async () => {
          const res = await page.request.get(`${API_BASE}/segments/${encodeURIComponent(seg.id)}`, {
            headers: apiHeaders(accessToken),
            failOnStatusCode: false,
          })
          if (res.status() >= 400) return null
          const body = await res.json()
          const obj = body as { props?: { target_text?: string }; target_text?: string }
          return obj.props?.target_text ?? obj.target_text ?? ''
        },
        { timeout: 10_000 },
      )
      .toBe('Hola, mundo.')

    await page.reload()
    const editorAfter = page.locator(`textarea[data-mol-id="segment-target-${seg.id}"]`).first()
    await expect(editorAfter).toHaveValue('Hola, mundo.')
  })

  test('approve persists segment status to the backend', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken, {
      source_lang: 'EN',
      target_langs: ['ES'],
    })
    const seg = await seedSegment(page, accessToken, {
      project_id: project.id,
      source_text: 'Pre-approved string.',
      source_lang: 'EN',
      target_lang: 'ES',
      position: 0,
    })
    // Make it not blank so the action makes semantic sense.
    await page.request.put(`${API_BASE}/segments/${encodeURIComponent(seg.id)}`, {
      headers: apiHeaders(accessToken),
      data: { target_text: 'Cadena pre-aprobada.', status: 'draft' },
      failOnStatusCode: true,
    })

    await page.goto(`${APP_BASE}/translate/${encodeURIComponent(project.id)}`)

    // Click the approve button — segment is auto-active when there's only one.
    const approveBtn = page.locator('button[data-mol-id="translate-approve"]').first()
    await expect(approveBtn).toBeVisible()
    await approveBtn.click()

    await expect
      .poll(
        async () => {
          const res = await page.request.get(`${API_BASE}/segments/${encodeURIComponent(seg.id)}`, {
            headers: apiHeaders(accessToken),
            failOnStatusCode: false,
          })
          if (res.status() >= 400) return null
          const body = await res.json()
          const obj = body as { props?: { status?: string }; status?: string }
          return obj.props?.status ?? obj.status ?? ''
        },
        { timeout: 10_000 },
      )
      .toBe('approved')
  })

  test('export downloads a CSV containing the segment rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken, {
      source_lang: 'EN',
      target_langs: ['ES'],
    })
    const seg = await seedSegment(page, accessToken, {
      project_id: project.id,
      source_text: 'Export me.',
      source_lang: 'EN',
      target_lang: 'ES',
      position: 0,
    })
    await page.request.put(`${API_BASE}/segments/${encodeURIComponent(seg.id)}`, {
      headers: apiHeaders(accessToken),
      data: { target_text: 'Expórtame.', status: 'approved' },
      failOnStatusCode: true,
    })

    // Hit the export endpoint directly via the API — the UI button uses
    // the same endpoint and just downloads the response. We assert the
    // contract here (reliable, browser-independent).
    const res = await page.request.get(
      `${API_BASE}/projects/${encodeURIComponent(project.id)}/export`,
      { headers: apiHeaders(accessToken), failOnStatusCode: true },
    )
    expect(res.headers()['content-type'] ?? '').toContain('text/csv')
    const body = await res.text()
    expect(body).toContain('source_text,target_text')
    expect(body).toContain('Export me.')
    expect(body).toContain('Expórtame.')
  })

  test('add segment form persists a new segment', async ({ page }) => {
    const { accessToken } = await signup(page)
    const project = await seedProject(page, accessToken, {
      source_lang: 'EN',
      target_langs: ['ES'],
    })

    await page.goto(`${APP_BASE}/translate/${encodeURIComponent(project.id)}`)
    const input = page.locator('textarea[data-mol-id="add-segment-source"]').first()
    await expect(input).toBeVisible({ timeout: 10_000 })
    await input.fill('A brand new source.')
    await page.locator('button[data-mol-id="add-segment-submit"]').first().click()

    await expect
      .poll(
        async () => {
          const res = await page.request.get(
            `${API_BASE}/segments?project_id=${encodeURIComponent(project.id)}`,
            { headers: apiHeaders(accessToken), failOnStatusCode: false },
          )
          const list = (await res.json()) as Array<Record<string, unknown>>
          return list.map((s) => s.source_text)
        },
        { timeout: 10_000 },
      )
      .toContain('A brand new source.')
  })
})
