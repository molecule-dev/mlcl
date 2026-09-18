import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, seedAgent, signup } from './_helpers.js'

test.describe('Prompt Editor (/agents/:id/prompt)', () => {
  test('redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/agents/00000000-0000-0000-0000-000000000000/prompt')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('loads system prompt from the seeded agent and shows publish/preview buttons', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, {
      system_prompt: 'You are a deterministic test bot.',
    })
    await page.goto(`${APP_BASE}/agents/${agent.id}/prompt`)
    await expect(page.locator('[data-mol-id="page-prompt-editor"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-mol-id="prompt-textarea"]')).toHaveValue(
      'You are a deterministic test bot.',
    )
    await expect(page.locator('[data-mol-id="prompt-publish"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="prompt-preview"]')).toBeVisible()
  })

  test('publish PUTs /api/agents/:id with new system_prompt and persists across reload', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, {
      system_prompt: 'Initial prompt.',
    })
    await page.goto(`${APP_BASE}/agents/${agent.id}/prompt`)
    await expect(page.locator('[data-mol-id="prompt-textarea"]')).toBeVisible({ timeout: 10000 })

    const next = 'Always respond in haiku.'
    await page.locator('[data-mol-id="prompt-textarea"]').fill(next)

    // Arm the wait BEFORE clicking publish so we don't race the PUT.
    const putPromise = page.waitForResponse(
      (resp) => resp.request().method() === 'PUT' && /\/api\/agents\/[^/]+$/.test(resp.url()),
      { timeout: 15000 },
    )
    await page.locator('[data-mol-id="prompt-publish"]').click()
    const putResp = await putPromise
    expect(putResp.status(), 'PUT /api/agents/:id should succeed').toBeLessThan(400)
    await expect(page.locator('[data-mol-id="prompt-info"]')).toBeVisible({ timeout: 10000 })

    // Confirm persistence via direct API read BEFORE reload — this rules out
    // a race where the textarea-on-reload sees a stale GET response served
    // before the PUT finished its DB write.
    const api = authedApi(request, session.accessToken!)
    await expect
      .poll(
        async () => {
          const res = await api.get(`/agents/${agent.id}`)
          if (res.status() !== 200) return null
          const body = await res.json()
          return body.system_prompt
        },
        { timeout: 10000 },
      )
      .toBe(next)

    await page.reload()
    await expect(page.locator('[data-mol-id="prompt-textarea"]')).toHaveValue(next, {
      timeout: 10000,
    })
  })

  test('preview opens an in-page modal showing the current draft', async ({ page, request }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, {
      system_prompt: 'Preview me please.',
    })
    await page.goto(`${APP_BASE}/agents/${agent.id}/prompt`)
    await expect(page.locator('[data-mol-id="prompt-textarea"]')).toBeVisible({ timeout: 10000 })
    await page.locator('[data-mol-id="prompt-preview"]').click()
    const modal = page.locator('[data-mol-id="prompt-preview-modal"]')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Preview me please.')
    await page.locator('[data-mol-id="prompt-preview-close"]').click()
    await expect(modal).toBeHidden()
  })

  test('clicking a version snapshot loads its content into the textarea', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const agent = await seedAgent(request, session.accessToken!, {
      system_prompt: 'Original.',
    })
    await page.goto(`${APP_BASE}/agents/${agent.id}/prompt`)
    await expect(page.locator('[data-mol-id="prompt-textarea"]')).toBeVisible({ timeout: 10000 })

    await page.locator('[data-mol-id="prompt-textarea"]').fill('Edited body — about to publish.')
    await page.locator('[data-mol-id="prompt-publish"]').click()
    await expect(page.locator('[data-mol-id="prompt-info"]')).toBeVisible({ timeout: 10000 })

    await page
      .locator('[data-mol-id="prompt-textarea"]')
      .fill('Local-only edit, not yet published.')
    const versions = page.locator('[data-mol-id="prompt-version"]')
    await expect(versions).toHaveCount(2, { timeout: 10000 })
    await versions.nth(1).click()
    await expect(page.locator('[data-mol-id="prompt-textarea"]')).toHaveValue('Original.')
  })
})
