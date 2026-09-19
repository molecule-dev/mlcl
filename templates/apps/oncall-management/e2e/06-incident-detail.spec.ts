import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  ackIncident,
  listIncidents,
  readIncident,
  signup,
  triggerIncident,
  uniqueEmail,
} from './_helpers.js'

test.describe('/incidents/:id', () => {
  test('renders the timeline with a trigger event', async ({ page }) => {
    await signup(page, uniqueEmail('det-timeline'))
    const incidents = await listIncidents(page)
    const target = incidents[0]!
    await page.goto(APP_BASE + `/incidents/${target.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(target.title)
    // The timeline must show the trigger event (kind label rendered uppercase).
    await expect(page.locator('ol li', { hasText: 'trigger' }).first()).toBeVisible()
  })

  test('ack via the UI button moves the incident to acknowledged', async ({ page }) => {
    await signup(page, uniqueEmail('det-ack'))
    const created = await triggerIncident(page, {
      title: `E2E detail ack flow ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'warning',
    })
    await page.goto(APP_BASE + `/incidents/${created.id}`)
    await page.waitForLoadState('networkidle')
    const ack = page.locator('[data-mol-id="incident-ack"]').first()
    await expect(ack).toBeVisible()
    await ack.click()
    await expect
      .poll(async () => (await readIncident(page, created.id)).status, { timeout: 15_000 })
      .toBe('acknowledged')
  })

  test('resolve from acknowledged state, then reopen CTA appears', async ({ page }) => {
    await signup(page, uniqueEmail('det-resolve'))
    const created = await triggerIncident(page, {
      title: `E2E detail resolve flow ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'info',
    })
    await ackIncident(page, created.id)
    await page.goto(APP_BASE + `/incidents/${created.id}`)
    await page.waitForLoadState('networkidle')
    const resolve = page.locator('[data-mol-id="incident-resolve"]').first()
    await expect(resolve).toBeVisible()
    await resolve.click()
    await expect
      .poll(async () => (await readIncident(page, created.id)).status, { timeout: 15_000 })
      .toBe('resolved')
    await expect(page.locator('[data-mol-id="incident-reopen"]').first()).toBeVisible()
  })

  test('posting a note through the form appends a timeline event', async ({ page }) => {
    await signup(page, uniqueEmail('det-note'))
    const created = await triggerIncident(page, {
      title: `E2E note flow ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'warning',
    })
    const noteText = `Investigating from the e2e run at ${Date.now()}`
    await page.goto(APP_BASE + `/incidents/${created.id}`)
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="incident-note-input"]').fill(noteText)
    await page.locator('[data-mol-id="incident-note-submit"]').click()
    await expect(page.locator('ol li', { hasText: noteText }).first()).toBeVisible({
      timeout: 15_000,
    })
    const after = await readIncident(page, created.id)
    expect(after.events.some((e) => e.kind === 'note')).toBe(true)
  })

  test('critical unacked incident shows the in-app pager banner', async ({ page }) => {
    await signup(page, uniqueEmail('det-banner'))
    const created = await triggerIncident(page, {
      title: `E2E pager banner ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'critical',
    })
    await page.goto(APP_BASE + `/incidents/${created.id}`)
    await page.waitForLoadState('networkidle')
    const banner = page.locator('[data-mol-id="incident-pager-banner"]')
    await expect(banner).toBeVisible()
    await page.locator('[data-mol-id="incident-ack-banner"]').click()
    await expect
      .poll(async () => (await readIncident(page, created.id)).status, { timeout: 15_000 })
      .toBe('acknowledged')
  })

  test('unknown incident id renders the not-found state', async ({ page }) => {
    await signup(page, uniqueEmail('det-404'))
    await page.goto(APP_BASE + '/incidents/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/not found/i)
  })
})
