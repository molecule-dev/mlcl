/**
 * /announcement/:id — detail page. Renders title + body + author,
 * acknowledge button mutates state, comment thread fetch + post + delete
 * cycle persists across reload.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  listComments,
  myAcks,
  seedAnnouncement,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('announcement detail page', () => {
  test('shows the seeded announcement title and body', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('detail-shows'))
    const ann = await seedAnnouncement(page, accessToken, {
      title: `Detail spec ${Date.now()}`,
      body: 'The body content for the detail spec.',
    })
    await page.goto(APP_BASE + `/announcement/${ann.id}`)
    await expect(page.getByTestId('detail-title')).toHaveText(ann.title)
    await expect(page.getByTestId('detail-body')).toContainText('The body content')
  })

  test('clicking Acknowledge persists an acknowledgment', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('detail-ack'))
    const ann = await seedAnnouncement(page, accessToken, {
      title: `Ack spec ${Date.now()}`,
      requires_acknowledgment: true,
    })
    await page.goto(APP_BASE + `/announcement/${ann.id}`)
    const before = await myAcks(page, accessToken)
    expect(before.find((a) => a.announcement_id === ann.id)).toBeFalsy()

    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('detail-ack').click()
      await page.waitForLoadState('networkidle')
    })
    const ack = reqs.find(
      (r) =>
        r.method === 'POST' && new RegExp(`/api/announcements/${ann.id}/acknowledge`).test(r.url),
    )
    expect(ack, 'should POST /api/announcements/:id/acknowledge').toBeTruthy()
    expect(ack!.status).toBeLessThan(400)

    const after = await myAcks(page, accessToken)
    expect(after.find((a) => a.announcement_id === ann.id)).toBeTruthy()
  })

  test('replying posts a real comment that survives reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('detail-reply'))
    const ann = await seedAnnouncement(page, accessToken, {
      title: `Reply spec ${Date.now()}`,
    })
    await page.goto(APP_BASE + `/announcement/${ann.id}`)
    const text = `Spec reply ${Date.now()}`
    await page.getByTestId('reply-textarea').fill(text)
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('reply-submit').click()
      await page.waitForLoadState('networkidle')
    })
    // Real backend invariant: a POST to /api/comments/:id must have fired.
    const post = reqs.find(
      (r) => r.method === 'POST' && new RegExp(`/api/comments/${ann.id}`).test(r.url),
    )
    expect(post, 'expected POST /api/comments/:id').toBeTruthy()
    expect(post!.status).toBeLessThan(400)

    await expect(page.getByText(text)).toBeVisible({ timeout: 10000 })

    // Persists across reload
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(text)).toBeVisible({ timeout: 10000 })

    // Server-side row exists too
    const comments = await listComments(page, accessToken, ann.id)
    expect(comments.find((c) => c.body === text)).toBeTruthy()
  })

  test('back link navigates to /feed', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('detail-back'))
    const ann = await seedAnnouncement(page, accessToken, {})
    await page.goto(APP_BASE + `/announcement/${ann.id}`)
    await page.getByTestId('detail-back-link').click()
    await page.waitForURL('**/feed', { timeout: 5000 })
  })

  test('shows not-found for a non-existent announcement', async ({ page }) => {
    await signup(page, uniqueEmail('detail-404'))
    await page.goto(APP_BASE + '/announcement/00000000-0000-0000-0000-000000000000')
    await expect(page.getByTestId('announcement-not-found')).toBeVisible({ timeout: 10000 })
  })

  test('reply submit is disabled while the textarea is empty', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('detail-disabled'))
    const ann = await seedAnnouncement(page, accessToken, {})
    await page.goto(APP_BASE + `/announcement/${ann.id}`)
    await expect(page.getByTestId('reply-submit')).toBeDisabled()
    await page.getByTestId('reply-textarea').fill('Hi')
    await expect(page.getByTestId('reply-submit')).toBeEnabled()
  })

  test('Acknowledge button switches to "Acknowledged" label after click', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('detail-ack-label'))
    const ann = await seedAnnouncement(page, accessToken, {
      title: `Ack label ${Date.now()}`,
      requires_acknowledgment: true,
    })
    await page.goto(APP_BASE + `/announcement/${ann.id}`)
    await page.getByTestId('detail-ack').click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('detail-ack')).toContainText(/acknowledged/i, {
      timeout: 10000,
    })
  })
})
