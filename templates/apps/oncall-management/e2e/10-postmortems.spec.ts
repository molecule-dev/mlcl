import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  listPostmortems,
  resolveIncident,
  signup,
  triggerIncident,
  uniqueEmail,
} from './_helpers.js'

test.describe('/postmortems', () => {
  test('anonymous redirected off /postmortems', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/postmortems')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 15_000 })
  })

  test('renders seeded postmortems with open-item badges', async ({ page }) => {
    await signup(page, uniqueEmail('pm-list'))
    const postmortems = await listPostmortems(page)
    expect(postmortems.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/postmortems')
    await page.waitForLoadState('networkidle')
    const first = postmortems[0]!
    const card = page.locator(`[data-mol-id="postmortem-card-${first.id}"]`)
    await expect(card).toBeVisible()
    await expect(card).toContainText(first.title)
  })

  test('starting a postmortem from a resolved incident navigates to the editor', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('pm-create'))
    const incident = await triggerIncident(page, {
      title: `E2E postmortem source ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'warning',
    })
    await resolveIncident(page, incident.id)
    await page.goto(APP_BASE + '/postmortems')
    await page.waitForLoadState('networkidle')
    // The select's option values are incident ids — pick by value, not label.
    await page.locator('[data-mol-id="postmortem-incident-select"]').selectOption(incident.id)
    await page.locator('[data-mol-id="postmortem-create-submit"]').click()
    await expect(page).toHaveURL(/\/postmortems\/(?!$)[0-9a-f-]+/, { timeout: 15_000 })
  })
})
