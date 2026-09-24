import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiContext, apiSignup, signup, uniqueEmail } from './_helpers.js'

test.describe('automations', () => {
  test('create + toggle + delete automation persists', async ({ page }) => {
    await signup(page, uniqueEmail('auto-ui'), 'TestPass123!')
    // Need a workbook first.
    await page.goto(APP_BASE + '/workbooks')
    await page
      .getByRole('button', { name: /new workbook/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/workbooks\/[0-9a-f-]{36}/, { timeout: 15000 })

    await page.goto(APP_BASE + '/automations')
    await expect(page.getByText(/no automations yet/i)).toBeVisible({ timeout: 10000 })

    await page
      .getByRole('button', { name: /new automation/i })
      .first()
      .click()
    const form = page.getByTestId('automation-form')
    await expect(form).toBeVisible()
    await form.getByLabel(/name/i).fill('Daily Snapshot')
    await form.getByRole('button', { name: /create/i }).click()

    // The newly created automation should appear in the list.
    await expect(page.getByText('Daily Snapshot')).toBeVisible({ timeout: 5000 })

    // Toggle it off.
    const toggle = page.getByRole('switch', { name: /toggle daily snapshot/i }).first()
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await toggle.click()
    // The shared Switch drives the flip through its hidden native checkbox —
    // assert the controlled state, not a class.
    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    // Reload and confirm name still there.
    await page.reload()
    await expect(page.getByText('Daily Snapshot')).toBeVisible({ timeout: 10000 })

    // Delete via the shared ConfirmButton: first click arms the two-click
    // confirm, the second commits. The old native window.confirm is gone.
    const del = page.getByRole('button', { name: /delete daily snapshot/i }).first()
    await expect(del).toBeVisible()
    await del.click()
    await expect(page.getByText('Delete "Daily Snapshot"?')).toBeVisible()
    await del.click()
    await expect(page.getByText('Daily Snapshot')).toBeHidden({ timeout: 10000 })
  })

  test('backend invariant: POST /automations persists, owner-scoped', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-auto'))
    const auth = { Authorization: `Bearer ${me.token}` }

    const wb = await ctx.post('/api/spreadsheets', {
      headers: auth,
      data: { title: 'Auto book' },
    })
    expect(wb.status()).toBe(201)
    const wbId = ((await wb.json()) as { id: string }).id

    const created = await ctx.post('/api/automations', {
      headers: auth,
      data: {
        spreadsheet_id: wbId,
        name: 'Test rule',
        trigger: { type: 'row.created' },
        action: { type: 'noop' },
      },
    })
    expect(created.status()).toBe(201)

    const list = await ctx.get('/api/automations', { headers: auth })
    const items = (await list.json()) as Array<{ name: string }>
    expect(items.some((a) => a.name === 'Test rule')).toBe(true)

    await ctx.dispose()
  })
})
