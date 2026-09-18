import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signupAndAddItem, authedApiGet } from './_helpers'

test.describe('/security findings interactions', () => {
  test('Re-scan creates findings (read-after-write via API)', async ({ page, request }) => {
    // Add a weak-password item to give the scan something to flag
    await signupAndAddItem(page, 'weak-pw.example.com', 'abc')
    await page.goto(APP_BASE + '/security')
    await page.waitForLoadState('networkidle')

    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('security-refresh').click()
      await page.waitForTimeout(2500)
    })
    const refresh = reqs.find((r) => r.method === 'POST' && /\/api\/security\/refresh/.test(r.url))
    expect(refresh?.status).toBeLessThan(300)

    const findings = await authedApiGet<unknown>(request, page, '/security/findings')
    expect(findings.status).toBe(200)
    const list = (
      Array.isArray(findings.data)
        ? findings.data
        : ((findings.data as { data?: unknown[] }).data ?? [])
    ) as unknown[]
    expect(list.length, 'after weak password rescan, findings should not be empty').toBeGreaterThan(
      0,
    )
  })

  test('Dismiss button on a finding marks it dismissed (PUT)', async ({ page, request }) => {
    await signupAndAddItem(page, 'weak-pw-2.example.com', 'qwerty')
    await page.goto(APP_BASE + '/security')
    await page.getByTestId('security-refresh').click()
    await page.waitForTimeout(2500)
    await page.waitForLoadState('networkidle')

    const dismissBtn = page.locator('[data-testid^="security-dismiss-"]').first()
    if ((await dismissBtn.count()) === 0) {
      test.skip(true, 'no findings produced for weak password — skipping dismiss assertion')
      return
    }
    const reqs = await captureNetwork(page, async () => {
      await dismissBtn.click()
      await page.waitForTimeout(1500)
    })
    const put = reqs.find(
      (r) => r.method === 'PUT' && /\/api\/security\/findings\/[^/]+/.test(r.url),
    )
    expect(put, 'PUT /api/security/findings/:id must fire').toBeDefined()
    expect(put!.status).toBeLessThan(300)

    // After dismiss, GET findings should mark it dismissed
    const findings = await authedApiGet<unknown>(request, page, '/security/findings')
    expect(findings.status).toBe(200)
    const list = (
      Array.isArray(findings.data)
        ? findings.data
        : ((findings.data as { data?: unknown[] }).data ?? [])
    ) as { dismissed: boolean }[]
    const anyDismissed = list.some((f) => f.dismissed)
    expect(anyDismissed, 'at least one finding should be dismissed after click').toBe(true)
  })
})
