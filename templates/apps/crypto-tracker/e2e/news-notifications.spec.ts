import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { signup } from './_helpers'

test('news page lists articles with signal pills', async ({ page }) => {
  await signup(page)
  await page.goto('/news')
  await expect(page.getByRole('heading', { name: /news/i }).first()).toBeVisible()

  const data = await page.evaluate(async () => {
    const r = await fetch('/api/news')
    const d = await r.json()
    return Array.isArray(d) ? d : d.data || []
  })
  expect(data.length).toBeGreaterThan(0)
  const sample = data[0]
  expect(sample.title).toBeTruthy()
  expect(['bullish', 'bearish', 'neutral']).toContain(sample.signal)
})

test('notifications page shows seeded user notifications', async ({ page }) => {
  await signup(page)
  await page.goto('/notifications')
  await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible()

  // Backend has notifications for this user
  const data = await page.evaluate(async () => {
    const r = await fetch('/api/notifications')
    const d = await r.json()
    return Array.isArray(d) ? d : d.data || []
  })
  expect(data.length).toBeGreaterThan(0)
  const sample = data[0]
  expect(sample.title).toBeTruthy()
  expect(sample.body).toBeTruthy()
  expect(typeof sample.unread).toBe('boolean')
})
