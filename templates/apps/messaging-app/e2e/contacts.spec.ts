import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  getContacts,
  pickContact,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('contacts page', () => {
  test('lists every contact the roster holds', async ({ page }) => {
    await signup(page, uniqueEmail('contacts'))
    // The roster is read from the API, so the spec still holds after the
    // demo contacts are replaced.
    const contacts = await getContacts(page)
    expect(contacts.length, 'roster must not be empty').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/contacts')
    for (const contact of contacts) {
      await expect(page.getByText(contact.name).first()).toBeVisible({ timeout: 15000 })
    }
  })

  test('GET /api/contacts is hit on contacts load', async ({ page }) => {
    await signup(page, uniqueEmail('contacts-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/contacts')
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.some(
        (r) => r.method === 'GET' && /\/api\/contacts(\?|$)/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('clicking a contact opens /contacts/:id detail', async ({ page }) => {
    await signup(page, uniqueEmail('contact-click'))
    const contact = await pickContact(page)
    await page.goto(APP_BASE + '/contacts')
    await page.getByRole('link', { name: contact.name, exact: false }).first().click()
    await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]{36}$/)
    await expect(page.getByText(contact.name).first()).toBeVisible()
  })
})
