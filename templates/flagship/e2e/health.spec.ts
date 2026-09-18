import { test, expect } from '@playwright/test'

test('API health check returns ok', async ({ request }) => {
  const response = await request.get('http://localhost:4001/health')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body.status).toBe('ok')
})
