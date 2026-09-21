import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, signup } from './_helpers.js'

interface RuleRow {
  id: string
  name: string
  trigger: string
  enabled: boolean
}

interface CannedResponse {
  id: string
  shortcut: string
  title: string
  content: string
}

test.describe('/automations', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('list page renders both Rules and Canned Responses sections (empty state)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/automations')
    await expect(page.getByRole('heading', { name: /automations/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^rules$/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /canned responses/i }).first()).toBeVisible()
    await expect(page.getByText(/no automation rules yet/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/no canned responses yet/i).first()).toBeVisible()
  })

  test('Create rule writes a real automation_rules row that survives reload', async ({ page }) => {
    await page.goto(APP_BASE + '/automations')
    await page
      .getByRole('button', { name: /\+\s*new rule/i })
      .first()
      .click()
    await page
      .getByPlaceholder(/rule name/i)
      .first()
      .fill('Auto-assign urgent tickets')
    await page.getByRole('combobox').first().selectOption('inbound_message')
    const respPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/api/automations') && r.request().method() === 'POST' && r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /save rule/i }).click()
    await respPromise
    const rules = await apiGet<RuleRow[]>(page, '/automations')
    const created = rules.find((r) => r.name === 'Auto-assign urgent tickets')
    expect(created, 'rule must be persisted').toBeTruthy()
    expect(created!.trigger).toBe('inbound_message')
    expect(created!.enabled).toBe(true)
    await page.reload()
    await expect(page.getByText(/Auto-assign urgent tickets/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('Toggle button flips enabled in the database (write-then-read)', async ({ page }) => {
    const created = await apiPost<RuleRow>(page, '/automations', {
      name: 'Toggle me',
      trigger: 'inbound_message',
      enabled: true,
    })
    await page.goto(APP_BASE + '/automations')
    const ruleCard = page.locator('li', { hasText: 'Toggle me' }).first()
    const respPromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/automations/${created.id}`) &&
        r.request().method() === 'PUT' &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    await ruleCard.getByRole('button', { name: /disable/i }).click()
    await respPromise
    const after = await apiGet<RuleRow>(page, `/automations/${created.id}`)
    expect(after.enabled).toBe(false)
  })

  test('Delete rule removes the row from the database AND the list', async ({ page }) => {
    const created = await apiPost<RuleRow>(page, '/automations', {
      name: 'Delete me',
      trigger: 'inbound_message',
    })
    await page.goto(APP_BASE + '/automations')
    const ruleCard = page.locator('li', { hasText: 'Delete me' }).first()
    const respPromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/automations/${created.id}`) &&
        r.request().method() === 'DELETE' &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    // Deletes are two-step (arm "Delete" → "Confirm?") so a single mis-tap
    // can't destroy a rule.
    await ruleCard.getByRole('button', { name: /^delete$/i }).click()
    await ruleCard.getByRole('button', { name: /confirm delete/i }).click()
    await respPromise
    const list = await apiGet<RuleRow[]>(page, '/automations')
    expect(
      list.find((r) => r.id === created.id),
      'rule must be deleted from DB',
    ).toBeFalsy()
  })

  test('Create canned response (with shortcut + content field) persists and shows in the grid', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/automations')
    await page
      .getByRole('button', { name: /\+\s*new canned/i })
      .first()
      .click()
    await page
      .getByPlaceholder(/shortcut/i)
      .first()
      .fill('/refund')
    await page.getByPlaceholder(/title/i).first().fill('Refund instructions')
    await page
      .getByPlaceholder(/reply body/i)
      .first()
      .fill('Hi! To start a refund, share your order number and we will process within 48 hours.')
    const respPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/api/canned-responses') &&
        r.request().method() === 'POST' &&
        r.status() < 400,
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /save canned response/i }).click()
    await respPromise
    const list = await apiGet<CannedResponse[]>(page, '/canned-responses')
    const created = list.find((c) => c.shortcut === '/refund')
    expect(created, 'canned response must be saved').toBeTruthy()
    expect(created!.title).toBe('Refund instructions')
    expect(created!.content).toContain('order number')
    await expect(page.getByText(/order number and we will process/i).first()).toBeVisible()
  })
})
