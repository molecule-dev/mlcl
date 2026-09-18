import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, authedApiGet } from './_helpers'

test.describe('Two-factor enrollment full flow', () => {
  test('enroll → verify → status reads enrolled+verified, then disable', async ({
    page,
    request,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-nav-twofa').click()

    // enroll
    const enrollReqs = await captureNetwork(page, async () => {
      await page.getByTestId('twofa-enroll').click()
      await page.waitForTimeout(2000)
    })
    expect(
      enrollReqs.find((r) => r.method === 'POST' && /\/api\/two-factor\/enroll/.test(r.url)),
      'enroll POST must fire',
    ).toBeDefined()
    await expect(page.getByTestId('twofa-secret')).toBeVisible()

    // verify with a 6-digit code (test-mode handler accepts any 4-12 char code)
    await page.getByTestId('twofa-verify-input').fill('123456')
    const verifyReqs = await captureNetwork(page, async () => {
      await page.getByTestId('twofa-verify-submit').click()
      await page.waitForTimeout(2000)
    })
    const verifyCall = verifyReqs.find(
      (r) => r.method === 'POST' && /\/api\/two-factor\/verify/.test(r.url),
    )
    expect(verifyCall, 'verify POST must fire').toBeDefined()
    expect(verifyCall!.status).toBeLessThan(300)

    // After verify, the page should show the enrolled view
    await expect(page.getByTestId('twofa-enrolled')).toBeVisible({ timeout: 10_000 })

    // Read-after-write — backend status reflects verification
    const status = await authedApiGet<{ enrolled: boolean; verified_at: string | null }>(
      request,
      page,
      '/two-factor/status',
    )
    expect(status.status).toBe(200)
    const data = status.data as { enrolled: boolean; verified_at: string | null }
    expect(data.enrolled).toBe(true)
    expect(data.verified_at, 'verified_at must be set after verify').toBeTruthy()

    // Disable
    page.on('dialog', (d) => d.accept())
    const disableReqs = await captureNetwork(page, async () => {
      await page.getByTestId('twofa-disable').click()
      await page.waitForTimeout(2000)
    })
    const disableCall = disableReqs.find(
      (r) => r.method === 'DELETE' && /\/api\/two-factor(\?|$)/.test(r.url),
    )
    expect(disableCall, 'disable DELETE must fire').toBeDefined()
    expect(disableCall!.status).toBeLessThan(300)

    // After disable, status reads enrolled: false
    const after = await authedApiGet<{ enrolled: boolean }>(request, page, '/two-factor/status')
    const afterData = after.data as { enrolled: boolean }
    expect(afterData.enrolled).toBe(false)
  })
})
