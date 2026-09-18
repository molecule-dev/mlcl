import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { signup, api, seedBoard, seedFrame, captureNetwork, APP_BASE } from './_helpers'

test.describe('/board/:id/present — presentation mode frames', () => {
  test('empty state with "Add first frame" CTA when board has no frames', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    await page.goto(APP_BASE + `/board/${board.id}/present`)
    await expect(page.locator('[data-mol-id="present-empty"]')).toBeVisible()
    await page.locator('[data-mol-id="present-add-first"]').click()
    await expect(page.locator('[data-mol-id="present-add-form"]')).toBeVisible()
    await page.locator('[data-mol-id="present-frame-name"]').fill('Intro frame')
    await page.locator('[data-mol-id="present-frame-body"]').fill('Welcome to the deck')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="present-frame-submit"]').click()
      await page.waitForTimeout(300)
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          new RegExp(`/api/frames/${board.id}`).test(r.url) &&
          r.status < 400,
      ),
      `expected POST /api/frames/${board.id} when adding the first frame — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
    const frames = await api<Array<{ id: string; name: string }>>(
      page,
      'GET',
      `/frames/${board.id}`,
    )
    expect(frames.some((f) => f.name === 'Intro frame')).toBe(true)
  })

  test('multiple frames render with prev/next nav and dot pagination', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    await seedFrame(page, {
      board_id: board.id,
      name: 'Slide A',
      viewport: { body: 'first body' },
      order_index: 0,
    })
    await seedFrame(page, {
      board_id: board.id,
      name: 'Slide B',
      viewport: { body: 'second body' },
      order_index: 1,
    })
    await page.goto(APP_BASE + `/board/${board.id}/present`)
    await expect(page.locator('[data-mol-id="present-frame"]')).toContainText('Slide A')
    // Dots — 2 of them
    await expect(page.locator('[data-mol-id^="present-dot-"]')).toHaveCount(2)
    await page.locator('[data-mol-id="present-next"]').click()
    await expect(page.locator('[data-mol-id="present-frame"]')).toContainText('Slide B')
    await page.locator('[data-mol-id="present-prev"]').click()
    await expect(page.locator('[data-mol-id="present-frame"]')).toContainText('Slide A')
    // Click the last dot — should jump.
    await page.locator('[data-mol-id="present-dot-1"]').click()
    await expect(page.locator('[data-mol-id="present-frame"]')).toContainText('Slide B')
  })

  test('exit link navigates back to /board/:id', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    await seedFrame(page, { board_id: board.id, name: 'Slide A', order_index: 0 })
    await page.goto(APP_BASE + `/board/${board.id}/present`)
    await page.locator('[data-mol-id="present-exit"]').click()
    await expect(page).toHaveURL(new RegExp(`/board/${board.id}$`))
  })
})
