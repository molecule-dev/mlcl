import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, signup } from './_helpers.js'

test.describe('notifications', () => {
  test('list, mark-as-read, and delete round-trip through the API', async ({ page }) => {
    await signup(page)

    // First GET seeds a starter set for new users; assert real shape, not just 200
    const initial = (await page.request.get(API_BASE + '/notifications').then((r) => r.json())) as {
      data: Array<{ id: string; unread: boolean; title: string }>
      unread: number
    }
    expect(initial.data.length, 'no notifications seeded for new user').toBeGreaterThanOrEqual(1)
    expect(initial.unread).toBeGreaterThanOrEqual(1)
    const target = initial.data.find((n) => n.unread)!
    expect(target).toBeTruthy()

    // Mark one as read and verify the GET reflects it
    const markResp = await page.request.post(API_BASE + `/notifications/${target.id}/read`)
    expect(markResp.status()).toBe(200)
    const afterRead = (await page.request
      .get(API_BASE + '/notifications')
      .then((r) => r.json())) as {
      data: Array<{ id: string; unread: boolean }>
      unread: number
    }
    const stillUnread = afterRead.data.find((n) => n.id === target.id)?.unread
    expect(stillUnread, 'notification still unread after mark-as-read').toBe(false)
    expect(afterRead.unread, 'unread count did not decrement').toBeLessThan(initial.unread)

    // Mark-all and assert no unread remain
    await page.request.post(API_BASE + '/notifications/read-all')
    const afterAll = (await page.request
      .get(API_BASE + '/notifications')
      .then((r) => r.json())) as {
      unread: number
    }
    expect(afterAll.unread, 'unread > 0 after read-all').toBe(0)

    // Delete one and confirm it's gone from the next GET
    const deleteId = initial.data[0]!.id
    const deleteResp = await page.request.delete(API_BASE + `/notifications/${deleteId}`)
    expect(deleteResp.status()).toBe(200)
    const afterDelete = (await page.request
      .get(API_BASE + '/notifications')
      .then((r) => r.json())) as {
      data: Array<{ id: string }>
    }
    expect(
      afterDelete.data.find((n) => n.id === deleteId),
      'deleted notification still present',
    ).toBeFalsy()
  })
})
