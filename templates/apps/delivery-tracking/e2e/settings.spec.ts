import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup, unwrap } from './_helpers.js'

test.describe('/settings', () => {
  test('renders the three section navigation buttons', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading', { name: /^Settings$/i })).toBeVisible()
      await expect(page.locator('[data-mol-id="button-section-organization"]')).toBeVisible()
      await expect(page.locator('[data-mol-id="button-section-api"]')).toBeVisible()
      await expect(page.locator('[data-mol-id="button-section-notifications"]')).toBeVisible()
    })
    const orgReq = reqs.find(
      (r) => r.method === 'GET' && /\/api\/settings\/organization/.test(r.url),
    )
    expect(orgReq, 'mount must fetch /api/settings/organization').toBeTruthy()
    expect(orgReq?.status).toBe(200)
  })

  test('saving organization name persists to /api/settings/organization', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const orgName = `Acme Logistics ${Date.now()}`
    await page.locator('[data-mol-id="input-org-name"]').fill(orgName)
    await page.locator('[data-mol-id="button-save-org"]').click()
    await expect(page.locator('[data-mol-id="org-saved-pill"]')).toBeVisible({ timeout: 10_000 })

    const { body } = await apiRequest<unknown>(page, 'GET', '/api/settings/organization')
    const data = unwrap<any>(body)
    expect(data.organization_name).toBe(orgName)
  })

  test('switching to "API access" reveals the public/secret/webhook fields', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="button-section-api"]').click()
    await expect(page.locator('[data-mol-id="field-public-key"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="field-secret-key"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="field-webhook-secret"]')).toBeVisible()
  })

  test('"Rotate keys" reveals the new secret once and the masked value changes', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="button-section-api"]').click()
    const secretBefore = await page.locator('[data-mol-id="field-secret-key"]').inputValue()
    await page.locator('[data-mol-id="button-rotate-keys"]').click()
    await expect(page.locator('[data-mol-id="api-secret-shown"]')).toBeVisible({ timeout: 10_000 })
    const secretAfter = await page.locator('[data-mol-id="field-secret-key"]').inputValue()
    expect(secretAfter).not.toBe(secretBefore)
  })

  test('toggling notifications.exception preference persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="button-section-notifications"]').click()
    const toggle = page.locator('[data-mol-id="toggle-email-exception"]')
    const before = await toggle.isChecked()
    await toggle.click()
    await expect(page.locator('[data-mol-id="prefs-saved-pill"]')).toBeVisible({ timeout: 10_000 })

    const { body } = await apiRequest<unknown>(page, 'GET', '/api/notifications/preferences')
    const data = unwrap<any>(body)
    expect(data.email_on_exception).toBe(!before)

    await page.reload()
    await page.locator('[data-mol-id="button-section-notifications"]').click()
    await expect(page.locator('[data-mol-id="toggle-email-exception"]')).toBeChecked({
      checked: !before,
    })
  })
})
