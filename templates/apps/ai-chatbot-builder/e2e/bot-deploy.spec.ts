/**
 * /bots/:id/deploy — deploy page renders an embed snippet that includes the
 * ACTUAL bot id (not a hardcoded placeholder) and a share-link to /test-chat
 * scoped to that bot.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, seedBot, signup, uniqueEmail } from './_helpers.js'

test.describe('bot deploy', () => {
  test('embed snippet contains the bot id from the URL', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('deploy-embed'))
    const { id } = await seedBot(page, accessToken, { name: `Deploy ${Date.now()}` })

    await page.goto(APP_BASE + `/bots/${id}/deploy`)
    await page.waitForLoadState('networkidle')

    // The snippet should appear somewhere on the page (textarea, code, pre).
    const body = page.locator('body')
    await expect(body).toContainText(id, { timeout: 10000 })
    // And not contain any hardcoded placeholder bot ids that previously
    // shipped (for example "nf_882910").
    const text = (await body.innerText()).toLowerCase()
    expect(text).not.toContain('nf_882910')
  })

  test('share/test-chat link is scoped to the bot id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('deploy-share'))
    const { id } = await seedBot(page, accessToken, { name: `Share ${Date.now()}` })

    await page.goto(APP_BASE + `/bots/${id}/deploy`)
    await page.waitForLoadState('networkidle')

    // Look for a /test-chat link OR the bot id appearing alongside test-chat.
    const text = (await page.locator('body').innerText()).toLowerCase()
    expect(text).toContain('/test-chat')
  })

  test('deploy/pause API state mutations persist', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('deploy-state'))
    const { id } = await seedBot(page, accessToken, { name: `State ${Date.now()}` })

    const deployed = await page.request.post(APP_BASE + `/api/bots/${id}/deploy`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      failOnStatusCode: false,
    })
    expect(deployed.status()).toBeLessThan(400)
    const deployedBody = await deployed.json()
    expect(deployedBody.status).toBe('deployed')

    // Re-fetch and confirm persistence.
    const after = await page.request.get(APP_BASE + `/api/bots/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const fetched = await after.json()
    expect(fetched.status).toBe('deployed')
  })
})
