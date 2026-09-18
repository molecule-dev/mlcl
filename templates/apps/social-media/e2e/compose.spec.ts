import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('Compose publishes a post and routes to the post detail', async ({ page }) => {
  const me = await signup(page)
  await page.goto(APP_BASE + '/compose')

  const captionInput = page.locator('textarea').first()
  await expect(captionInput).toBeVisible()
  const uniqueCaption = `e2e composed post ${Date.now()}`
  await captionInput.fill(uniqueCaption)

  await page.locator('input').nth(0).fill('vivid e2e composed')
  await page.locator('input').nth(1).fill('Test City')

  const publish = page.getByRole('button', { name: /publish/i })
  await expect(publish).toBeEnabled()
  await Promise.all([page.waitForURL(/\/posts\/[\w-]+/, { timeout: 15_000 }), publish.click()])

  // The post detail page should show our caption
  await expect(page.locator(`text=${uniqueCaption}`)).toBeVisible()

  // Read-after-write: GET /api/posts/:id returns the same caption
  const url = page.url()
  const id = url.split('/posts/')[1]?.split('?')[0]?.split('#')[0]
  expect(id).toBeTruthy()
  const res = await page.request.get(`/api/posts/${id}`, {
    headers: { Authorization: `Bearer ${me.accessToken}` },
  })
  expect(res.status()).toBe(200)
  const json = (await res.json()) as { caption: string; tags: string[] }
  expect(json.caption).toBe(uniqueCaption)
  expect(json.tags).toContain('vivid')
})
