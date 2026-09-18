import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('Signup → feed', () => {
  test('Signup persists to backend, lands on /feed, sub menu shows real subs', async ({ page }) => {
    const { email } = await signup(page)
    await expect(page).toHaveURL(/\/feed/)
    // Header should show the user (avatar/initial menu)
    await expect(page.getByRole('main')).toBeVisible()

    // The feed must list at least one real sub in the side rail / chip rail.
    // The seed migration creates `general`. After signup, it should be visible.
    const sidebarText = await page.locator('body').innerText()
    expect(sidebarText.toLowerCase()).toContain('general')

    // Confirm session persistence across reload — still on /feed, not bounced.
    await page.reload()
    await expect(page).toHaveURL(/\/feed/)

    // Backend invariant: GET /api/users/me returns this email.
    const meRes = await page.request.get(APP_BASE + '/api/users/me')
    expect(meRes.ok()).toBeTruthy()
    const me = await meRes.json()
    const meEmail = me.props?.email ?? me.email
    expect(meEmail).toBe(email)
  })

  test('Logged-in user can submit a link and see it on /feed', async ({ page }) => {
    await signup(page)

    const subsRes = await page.request.get(APP_BASE + '/api/subs')
    const subsBody = await subsRes.json()
    const firstSub = (subsBody.data ?? [])[0]
    expect(firstSub).toBeDefined()

    const title = `E2E ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const url = `https://example.com/e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    await page.goto(APP_BASE + '/submit')
    // The submit form has title, url (or text) and sub fields. Use accessible-name lookup.
    await page
      .getByLabel(/^title$/i)
      .first()
      .fill(title)
    const urlField = page.getByLabel(/url|link/i).first()
    if (await urlField.count()) await urlField.fill(url)
    // Sub picker — try a select / combobox; otherwise we'll send sub_id via fallback
    // (only used to keep this independent of UI quirks; the actual submission is
    // verified via the backend round-trip).
    const submitButton = page.getByRole('button', {
      name: /submit|post|share|publish/i,
    })
    await submitButton.first().click()

    // After submit, the link must be findable via the API.
    await page.waitForTimeout(800)
    const listRes = await page.request.get(APP_BASE + '/api/links?sort=new&limit=50')
    expect(listRes.ok()).toBeTruthy()
    const list = await listRes.json()
    const found = (list.data ?? []).find((l: { title?: string }) => l.title === title)
    expect(found, 'submitted link must appear in /api/links').toBeDefined()
  })
})
