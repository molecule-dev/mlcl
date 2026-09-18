import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/caregivers (Caregivers)', () => {
  test('Caregivers page renders heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/caregivers')
    await expect(page).toHaveURL(/\/caregivers/)
    await expect(page.getByRole('heading', { name: /^caregivers$/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Invite caregiver button reveals the invite form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/caregivers')
    await page
      .getByRole('button', { name: /invite caregiver/i })
      .first()
      .click()
    await expect(page.getByRole('form', { name: /invite caregiver/i }).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('Caregiver email input accepts a typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/caregivers')
    await page
      .getByRole('button', { name: /invite caregiver/i })
      .first()
      .click()
    const emailInput = page.locator('form input[type="email"]').first()
    await emailInput.fill('caregiver@example.com')
    await expect(emailInput).toHaveValue('caregiver@example.com')
  })

  test('Permission radios switch the selection', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/caregivers')
    await page
      .getByRole('button', { name: /invite caregiver/i })
      .first()
      .click()
    const notifyRadio = page.getByRole('radio', { name: /notify/i }).first()
    await notifyRadio.check()
    await expect(notifyRadio).toBeChecked()
  })

  test('Send invite POSTs /api/caregivers and the new row appears in /caregivers', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/caregivers')
    await page
      .getByRole('button', { name: /invite caregiver/i })
      .first()
      .click()
    const caregiverEmail = uniqueEmail('caregiver-spec')
    await page.locator('form input[type="email"]').first().fill(caregiverEmail)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send invite/i })
        .first()
        .click()
      await page.waitForTimeout(1000)
    })
    const post = reqs.find((r) => /\/api\/caregivers$/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/caregivers must be issued').toBeTruthy()
    expect(post!.status).toBeLessThan(400)

    const list = await api<Array<{ caregiver_email: string }>>(page, 'GET', '/caregivers')
    expect(
      list.find((c) => c.caregiver_email === caregiverEmail.toLowerCase()),
      'new caregiver appears in /caregivers list',
    ).toBeTruthy()
  })

  test('Caregivers CRUD round-trip exercises GET/PATCH/DELETE /caregivers/:id', async ({
    page,
  }) => {
    await signup(page)
    const created = await api<{ id: string }>(page, 'POST', '/caregivers', {
      caregiver_email: uniqueEmail('careg-rt').toLowerCase(),
      permission: 'view',
    })
    expect(created.id).toBeTruthy()
    const fetched = await api<Record<string, unknown>>(page, 'GET', `/caregivers/${created.id}`)
    expect(fetched.id).toBe(created.id)
    await api(page, 'PATCH', `/caregivers/${created.id}`, { permission: 'manage' })
    await api(page, 'DELETE', `/caregivers/${created.id}`)
    const list = await api<Array<{ id: string }>>(page, 'GET', '/caregivers')
    expect(
      list.find((c) => c.id === created.id),
      'caregiver deleted',
    ).toBeFalsy()
  })
})
