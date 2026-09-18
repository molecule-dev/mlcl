import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, pickContact, signup, uniqueEmail } from './_helpers.js'

test.describe('new-conversation page', () => {
  test('lists contacts that you can pick', async ({ page }) => {
    await signup(page, uniqueEmail('newconv'))
    // The picker lists the caller's real roster, so read it from the API.
    const contact = await pickContact(page)
    await page.goto(APP_BASE + '/conversations/new')
    await expect(page.getByText(contact.name).first()).toBeVisible({ timeout: 15000 })
  })

  test('selecting a contact and clicking Start posts to /api/conversations and lands on /conversations/:id', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('newconv-start'))
    const contact = await pickContact(page)
    await page.goto(APP_BASE + '/conversations/new')
    await expect(page.getByText(contact.name).first()).toBeVisible({ timeout: 15000 })

    // The contact button renders as "<initials> <name>"; match on the name
    // as a substring so the page heading (not a button) can't be hit.
    await page.getByRole('button', { name: contact.name, exact: false }).first().click()

    const reqs = await captureNetwork(page, async () => {
      const startBtn = page.getByRole('button', { name: /start conversation/i }).first()
      await expect(startBtn).toBeVisible()
      await startBtn.click()
      await page.waitForURL(/\/conversations\/[0-9a-f-]{36}$/, { timeout: 20000 })
    })
    // Backend may return 201 for a fresh conversation or 200 when it dedupes
    // to an existing direct thread (the picked contact may already have one).
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          /\/api\/conversations\b/.test(r.url) &&
          (r.status === 200 || r.status === 201),
      ),
    ).toBeTruthy()
  })
})
