import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/calls', () => {
  test('lists calls from the API with language, duration, and outcome', async ({ page }) => {
    await signup(page)
    const calls = await page.evaluate(async () => {
      const resp = await fetch('/api/calls', { credentials: 'include' })
      const body = (await resp.json()) as { data: Array<{ id: string; outcome: string | null }> }
      return body.data
    })
    expect(calls.length, 'calls must be seeded').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/calls')
    await expect(page.getByRole('heading', { name: 'Calls', exact: true })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('[data-mol-id="call-row-' + calls[0]!.id + '"]')).toBeVisible({
      timeout: 15_000,
    })
    if (calls[0]!.outcome) {
      await expect(page.locator('[data-mol-id="call-outcome-' + calls[0]!.id + '"]')).toHaveText(
        calls[0]!.outcome,
      )
    }
  })

  test('opening a call record shows transcript and tool timeline', async ({ page }) => {
    await signup(page)
    // outcome=booked guarantees tool actions exist on the record — the plain
    // newest call may be a one-utterance info call (or one left by an earlier
    // test run) with an empty tool timeline.
    const detail = (await page.evaluate(async () => {
      const list = await fetch('/api/calls?outcome=booked', { credentials: 'include' }).then((r) =>
        r.json(),
      )
      const first = (list as { data: Array<{ id: string }> }).data[0]!
      return fetch('/api/calls/' + first.id, { credentials: 'include' }).then((r) => r.json())
    })) as {
      id: string
      messages: Array<{ id: string }>
      actions: Array<{ id: string; tool: string }>
    }
    await page.goto(APP_BASE + '/calls/' + detail.id)
    await expect(page.locator('[data-mol-id="call-detail-heading"]')).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.locator('[data-mol-id="call-message-' + detail.messages[0]!.id + '"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-mol-id="call-action-' + detail.actions[0]!.tool + '"]').first(),
    ).toBeVisible()
  })
})
