import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

interface UtterancePayload {
  detected_language: string
  reply_language: string
  engine: 'llm' | 'scripted'
  reply: string
  actions: Array<{ id: string; tool: string }>
}

/**
 * The signature flow: a simulated inbound call on the deterministic
 * scripted engine (no AI key required). The agent detects the caller's
 * language, searches availability, and books a room through the SAME PMS
 * tools the front desk uses.
 */
test.describe('/simulator (scripted call)', () => {
  test.setTimeout(120_000)

  test('start → offer → confirm books a room and records both tool calls', async ({ page }) => {
    await signup(page)
    const phoneCodesBefore = await page.evaluate(async () => {
      const resp = await fetch('/api/reservations?source=phone', { credentials: 'include' })
      const body = (await resp.json()) as { data: Array<{ confirmation_code: string }> }
      return new Set(body.data.map((r) => r.confirmation_code))
    })

    await page.goto(APP_BASE + '/simulator')
    await expect(page.getByRole('heading', { name: /Call Simulator/i })).toBeVisible({
      timeout: 15_000,
    })
    // Scripted mode is the default engine selection.
    await expect(page.locator('[data-mol-id="simulator-mode-select"]')).toHaveValue('scripted')

    await page.locator('[data-mol-id="simulator-start"]').click()
    await expect(page.locator('[data-mol-id="simulator-transcript"] p').first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.locator('[data-mol-id="simulator-entry-agent"]').first()).toContainText(
      /calling|recepción|réception|Rezeption|来电|フロント/i,
    )

    // Turn 1 — availability question (booking intent).
    const utterance1 = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/calls\/[^/]+\/utterance/.test(r.url()),
      { timeout: 60_000 },
    )
    await page
      .locator('[data-mol-id="simulator-utterance"]')
      .fill('Hello, I would like to book a room for two nights')
    await page.locator('[data-mol-id="simulator-send"]').click()
    const turn1 = (await utterance1.json()) as UtterancePayload
    expect(
      turn1.actions.some((a) => a.tool === 'search_availability'),
      'search tool must run',
    ).toBe(true)
    await expect(
      page.locator('[data-mol-id="simulator-action-search_availability"]').first(),
    ).toBeVisible({ timeout: 10_000 })

    // Turn 2 — confirm the first option.
    const utterance2 = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/calls\/[^/]+\/utterance/.test(r.url()),
      { timeout: 60_000 },
    )
    await page.locator('[data-mol-id="simulator-utterance"]').fill('Yes, the first one please')
    await page.locator('[data-mol-id="simulator-send"]').click()
    const turn2 = (await utterance2.json()) as UtterancePayload
    const booking = turn2.actions.find((a) => a.tool === 'create_reservation')
    expect(booking, 'booking tool must run').toBeDefined()
    await expect(
      page.locator('[data-mol-id="simulator-action-create_reservation"]').first(),
    ).toBeVisible({ timeout: 10_000 })

    // Read-after-write: a new phone-sourced reservation exists.
    const created = await page.evaluate(
      async (before: string[]) => {
        const resp = await fetch('/api/reservations?source=phone', { credentials: 'include' })
        const body = (await resp.json()) as {
          data: Array<{ confirmation_code: string; status: string }>
        }
        return body.data.find((r) => !before.includes(r.confirmation_code)) ?? null
      },
      [...phoneCodesBefore],
    )
    expect(created, 'a phone reservation must be created').not.toBeNull()
    expect(created!.confirmation_code).toMatch(/^[A-Z2-9]{8}$/)
    expect(created!.status).toBe('confirmed')

    // End the call — outcome inferred from the booking tool call.
    await page.locator('[data-mol-id="simulator-end-call"]').click()
    await expect(page.locator('[data-mol-id="simulator-outcome"]')).toHaveText('booked', {
      timeout: 20_000,
    })
  })

  test('a Spanish caller is detected and answered in Spanish', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/simulator')
    await page.locator('[data-mol-id="simulator-start"]').click()
    await expect(page.locator('[data-mol-id="simulator-transcript"] p').first()).toBeVisible({
      timeout: 20_000,
    })

    const utterance = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/calls\/[^/]+\/utterance/.test(r.url()),
      { timeout: 60_000 },
    )
    await page
      .locator('[data-mol-id="simulator-utterance"]')
      .fill('Hola, ¿tienen habitaciones libres este fin de semana?')
    await page.locator('[data-mol-id="simulator-send"]').click()
    const turn = (await utterance.json()) as UtterancePayload
    expect(turn.detected_language, 'Spanish must be detected').toBe('es')
    expect(turn.reply_language, 'agent replies in the caller language').toBe('es')
    expect(turn.reply).toMatch(/habitaci|disponible|fin de semana/i)
    // The call record persists the detected language.
    await expect(page.locator('[data-mol-id="simulator-call-state"]')).toContainText(/es/i)
  })

  test('ending a call writes the outcome to the call record', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/simulator')
    await page.locator('[data-mol-id="simulator-start"]').click()
    await expect(page.locator('[data-mol-id="simulator-transcript"] p').first()).toBeVisible({
      timeout: 20_000,
    })
    // An info-only question → outcome "info".
    const utterance = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/calls\/[^/]+\/utterance/.test(r.url()),
      { timeout: 60_000 },
    )
    await page.locator('[data-mol-id="simulator-utterance"]').fill('What time is breakfast?')
    await page.locator('[data-mol-id="simulator-send"]').click()
    await utterance
    await page.locator('[data-mol-id="simulator-end-call"]').click()
    await expect(page.locator('[data-mol-id="simulator-outcome"]')).toHaveText('info', {
      timeout: 20_000,
    })
    const detail = (await page.evaluate(async () => {
      const list = await fetch('/api/calls', { credentials: 'include' }).then((r) => r.json())
      const latest = (list as { data: Array<{ id: string }> }).data[0]!
      return fetch('/api/calls/' + latest.id, { credentials: 'include' }).then((r) => r.json())
    })) as { outcome: string | null; ended_at: string | null; duration_seconds: number }
    expect(detail.outcome).toBe('info')
    expect(detail.ended_at).not.toBeNull()
    expect(detail.duration_seconds).toBeGreaterThanOrEqual(0)
  })
})
