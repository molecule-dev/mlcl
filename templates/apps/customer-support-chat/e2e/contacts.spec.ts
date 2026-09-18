import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, signup } from './_helpers.js'

interface ContactRow {
  id: string
  name: string | null
  email: string | null
  company: string | null
  phone: string | null
  user_id: string
}

test.describe('/contacts', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('list page renders and shows the empty state for a fresh user', async ({ page }) => {
    await page.goto(APP_BASE + '/contacts')
    await expect(page.getByRole('heading', { name: /contacts/i }).first()).toBeVisible()
    await expect(page.getByText(/no contacts yet|add your first/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('add contact form persists a real contact (read-after-write)', async ({ page }) => {
    await page.goto(APP_BASE + '/contacts')
    await page
      .getByRole('button', { name: /add contact|new contact/i })
      .first()
      .click()
    await page.getByPlaceholder(/name/i).first().fill('Maya Reyes')
    await page.getByPlaceholder(/email/i).first().fill('maya@theroastery.co')
    await page
      .getByPlaceholder(/company/i)
      .first()
      .fill('The Roastery')
    const respPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/api/contacts') && r.request().method() === 'POST' && r.status() < 400,
      { timeout: 15_000 },
    )
    await page
      .getByRole('button', { name: /save contact|add contact|create/i })
      .first()
      .click()
    await respPromise
    // Backend invariant.
    const list = await apiGet<ContactRow[]>(page, '/contacts')
    const created = list.find((c) => c.email === 'maya@theroastery.co')
    expect(created, 'contact must be saved').toBeTruthy()
    expect(created!.name).toBe('Maya Reyes')
    expect(created!.company).toBe('The Roastery')
    // Reload page — contact still in list.
    await page.reload()
    await expect(page.getByText(/maya@theroastery|Maya Reyes/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('clicking a contact row opens /contacts/:id and renders that contact (not a hardcoded mockup)', async ({
    page,
  }) => {
    const created = await apiPost<ContactRow>(page, '/contacts', {
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      company: 'JordanCo',
      phone: '+1-555-0100',
    })
    await page.goto(APP_BASE + `/contacts/${created.id}`)
    // Heading must reflect THIS contact, not the old hardcoded "Maya Reyes".
    await expect(page.getByRole('heading', { name: /jordan lee/i }).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/jordan@example/i).first()).toBeVisible()
    // No leftover Maya Reyes text from the previous mockup.
    await expect(page.getByText(/Maya Reyes/i)).toHaveCount(0)
  })

  test('contact detail conversations section reflects matching support_conversations by visitor_email', async ({
    page,
  }) => {
    const contact = await apiPost<ContactRow>(page, '/contacts', {
      name: 'Sammy Customer',
      email: 'sammy@example.com',
    })
    await apiPost(page, '/conversations', {
      subject: 'Sammy needs help with billing',
      visitor_name: 'Sammy Customer',
      visitor_email: 'sammy@example.com',
      priority: 'normal',
    })
    await page.goto(APP_BASE + `/contacts/${contact.id}`)
    await expect(page.getByText(/Sammy needs help with billing/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })
})
