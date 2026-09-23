import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { api, rawApi, signup } from './_helpers.js'

test.describe('meetings CRUD', () => {
  test('user creates a meeting via API → it appears on /schedule', async ({ page }) => {
    await signup(page)

    const created = await api<{ id: string; title: string; join_code: string }>(
      page,
      'POST',
      '/meetings',
      {
        title: 'Strategy sync',
        starts_at: new Date(Date.now() + 60 * 60_000).toISOString(),
        ends_at: new Date(Date.now() + 90 * 60_000).toISOString(),
      },
    )
    expect(created.id).toBeTruthy()
    expect(created.join_code).toBeTruthy()

    await page.goto('/schedule')
    await expect(page.getByText('Strategy sync')).toBeVisible()
  })

  test('schedule modal posts new meeting and refreshes list', async ({ page }) => {
    await signup(page)
    await page.goto('/schedule')

    await page.getByTestId('open-create-meeting').click()
    await page.getByTestId('create-meeting-form').waitFor({ state: 'visible' })

    await page.getByLabel('Meeting title').fill('Friday demo')
    await page.getByTestId('submit-create-meeting').click()
    await expect(page).toHaveURL(/\/meeting\/.*\/details/)

    const list = await api<Array<{ id: string; title: string }>>(page, 'GET', '/meetings')
    expect(list.some((m) => m.title === 'Friday demo')).toBe(true)
  })

  test('meeting detail loads real meeting and renders join code', async ({ page }) => {
    await signup(page)
    const meeting = await api<{ id: string; title: string; join_code: string }>(
      page,
      'POST',
      '/meetings',
      {
        title: 'Detail page test',
      },
    )
    await page.goto(`/meeting/${meeting.id}/details`)
    await expect(page.getByTestId('meeting-title')).toHaveText('Detail page test')
    await expect(page.getByTestId('meeting-code')).toHaveText(meeting.join_code)
  })

  test('edit meeting persists title change', async ({ page }) => {
    await signup(page)
    const meeting = await api<{ id: string }>(page, 'POST', '/meetings', { title: 'Old title' })
    await page.goto(`/meeting/${meeting.id}/details`)
    await page.getByTestId('edit-meeting').click()
    await page.getByTestId('edit-meeting-form').waitFor()
    const titleInput = page.getByLabel('Edit meeting title')
    await titleInput.fill('New title')
    await page.getByTestId('save-edit-meeting').click()
    await expect(page.getByTestId('edit-meeting-form')).toBeHidden({ timeout: 10_000 })
    const refreshed = await api<{ title: string }>(page, 'GET', `/meetings/${meeting.id}`)
    expect(refreshed.title).toBe('New title')
  })

  test('cancel meeting deletes it and navigates back to schedule', async ({ page }) => {
    await signup(page)
    const meeting = await api<{ id: string }>(page, 'POST', '/meetings', {
      title: 'To be cancelled',
    })
    await page.goto(`/meeting/${meeting.id}/details`)
    // Cancel is destructive — the UI confirms inline before deleting.
    await page.getByTestId('cancel-meeting').click()
    await page.getByTestId('confirm-cancel-dialog').waitFor()
    await page.getByTestId('confirm-cancel-meeting').click()
    await expect(page).toHaveURL(/\/schedule/)
    const after = await rawApi(page, 'GET', `/meetings/${meeting.id}`)
    expect([404, 500]).toContain(after.status)
  })

  test('invite emails sends invite rows', async ({ page }) => {
    await signup(page)
    const meeting = await api<{ id: string }>(page, 'POST', '/meetings', { title: 'Invite test' })
    await page.goto(`/meeting/${meeting.id}/details`)
    await page.getByTestId('toggle-invite').click()
    await page.getByTestId('invite-form').waitFor()
    await page.getByLabel('Invite emails').fill('alice@example.com,bob@example.com')
    await page.getByTestId('submit-invite').click()
    await expect(page.getByTestId('invite-success')).toBeVisible({ timeout: 10_000 })

    const invites = await api<Array<{ invitee_email: string }>>(
      page,
      'GET',
      `/invites/by-meeting/${meeting.id}`,
    )
    const emails = invites.map((i) => i.invitee_email).sort()
    expect(emails).toEqual(['alice@example.com', 'bob@example.com'])
  })

  test('dashboard join-by-code resolves valid codes', async ({ page }) => {
    await signup(page)
    const meeting = await api<{ id: string; join_code: string }>(page, 'POST', '/meetings', {
      title: 'Joinable',
    })
    await page.goto('/dashboard')
    await page.getByLabel('Meeting code').fill(meeting.join_code)
    await page.getByRole('button', { name: /^join$/i }).click()
    await expect(page).toHaveURL(/\/meeting\/.*\/lobby/)
  })

  test('dashboard join-by-code shows error on invalid code', async ({ page }) => {
    // The invalid-code lookup legitimately 404s — silence the expected
    // console error before it fires (console-guard fails the test otherwise).
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404',
    })
    await signup(page)
    await page.goto('/dashboard')
    await page.getByLabel('Meeting code').fill('definitely-not-a-real-code-zzz')
    await page.getByRole('button', { name: /^join$/i }).click()
    await expect(page.getByTestId('join-error')).toBeVisible()
  })
})
