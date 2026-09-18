import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, uniqueHandle, whereUrl } from './_helpers.js'

/**
 * End-to-end kitchen-sink: sign up, hit every primary user-facing
 * surface, mutate state, reload, prove persistence, finish at billing
 * with a real Stripe Checkout URL.
 *
 * This spec is intentionally one big test rather than many small ones
 * — its job is to prove the whole thing strings together for a
 * paying customer in one continuous flow.
 */
test.describe('Cross-page user journey', () => {
  test('signup → projects → editor → mixer → settings → billing → Stripe checkout', async ({
    page,
    request,
  }) => {
    const handle = uniqueHandle('journey')
    const session = await signup(page, { handle })
    expect(session.accessToken, 'auth token captured').toBeTruthy()
    expect(session.userId, 'user id captured').toBeTruthy()

    // Step 1: dashboard renders
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /Welcome back to the booth/i })).toBeVisible()

    // Step 2: navigate to /projects, create one through the modal UI
    await page.goto(APP_BASE + '/projects')
    await page.getByRole('button', { name: /new project/i }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    const projectName = 'Journey Project ' + Date.now()
    await modal.locator('input[required]').first().fill(projectName)
    await page.getByRole('button', { name: /create project/i }).click()
    await page.waitForURL(/\/projects\/[a-f0-9-]+$/, { timeout: 15_000 })
    const projectId = page.url().split('/').pop()!
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible()

    // Step 3: add an audio + midi track in the editor, prove they're real
    await page.getByRole('button', { name: /add audio track/i }).click()
    await page.waitForTimeout(1500)
    await page.getByRole('button', { name: /add MIDI track/i }).click()
    await page.waitForTimeout(1500)
    const api = authedApi(request, session.accessToken!)
    const tracksRes = await api.get(`/tracks?project_id=${projectId}`)
    const tracksBody = await tracksRes.json()
    const tracks = (
      Array.isArray(tracksBody)
        ? tracksBody
        : (tracksBody.data ?? tracksBody.items ?? tracksBody.props ?? tracksBody)
    ) as Array<{ id: string; type: string; name: string; muted: boolean }>
    expect(tracks.length, 'two tracks created').toBeGreaterThanOrEqual(2)
    const audioTrack = tracks.find((t) => t.type === 'audio')!
    expect(audioTrack).toBeDefined()

    // Step 4: open the mixer, mute the audio track, prove persistence
    await page.goto(APP_BASE + `/projects/${projectId}/mix`)
    await page.waitForLoadState('networkidle')
    const muteBtn = page.getByRole('button', { name: new RegExp(`Mute ${audioTrack.name}`) })
    await expect(muteBtn).toBeVisible()
    await muteBtn.click()
    await page.waitForTimeout(1500)
    const tracksAfter = await (await api.get(`/tracks?project_id=${projectId}`)).json()
    const tracksAfterArr = Array.isArray(tracksAfter)
      ? tracksAfter
      : (tracksAfter.data ?? tracksAfter.items ?? tracksAfter.props ?? tracksAfter)
    const muted = tracksAfterArr.find((t: { id: string }) => t.id === audioTrack.id)
    expect(muted.muted, 'mute persisted to DB').toBe(true)

    // Step 5: reload and confirm the mute state survives
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('button', { name: new RegExp(`Mute ${audioTrack.name}`) }),
    ).toHaveAttribute('aria-pressed', 'true')

    // Step 6: jump to settings, change a profile field, save, reload, persistence
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const newCity = 'JourneyCity-' + Date.now()
    await page.locator('#settings-city').fill(newCity)
    await page.getByRole('button', { name: /save profile/i }).click()
    await expect(page.getByRole('status')).toBeVisible({ timeout: 5_000 })
    await page.reload()
    await expect(page.locator('#settings-city')).toHaveValue(newCity)

    // Step 7: go to /samples (auth-required, must render with no 5xx)
    await page.goto(APP_BASE + '/samples')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /Samples & loops/i })).toBeVisible()

    // Step 8: profile page renders the user
    await page.goto(APP_BASE + `/profile/${handle}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(new RegExp(`@${handle}`, 'i'))).toBeVisible()

    // Step 9: billing page → real Stripe Checkout for Pro
    await page.goto(APP_BASE + '/settings/billing')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="plan-pro"]')).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="checkout-pro"]').click()
      await page.waitForURL(/checkout\.stripe\.com|cs_test_/, { timeout: 20_000 })
    })
    const checkout = whereUrl(reqs, /\/api\/billing\/checkout/, 'POST')
    expect(checkout.length, 'POST /api/billing/checkout fired').toBeGreaterThan(0)
    expect(checkout[0].status).toBeLessThan(300)
    expect(page.url(), 'redirected to real Stripe Checkout').toMatch(
      /checkout\.stripe\.com|cs_test_/,
    )
  })
})
