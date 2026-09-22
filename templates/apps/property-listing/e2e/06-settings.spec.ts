import { expect, test, type Page } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiContext, getAccessToken, signup } from './_helpers.js'

/**
 * Walk every <label> on the page and fill the input/textarea inside the
 * same parent container with `value` if the label text matches `regex`.
 * Returns the count of fills performed.
 */
async function fillByLabel(page: Page, regex: RegExp, value: string): Promise<number> {
  return page.evaluate(
    ({ source, value }) => {
      const re = new RegExp(source, 'i')
      const labels = Array.from(document.querySelectorAll('label')) as HTMLLabelElement[]
      let count = 0
      for (const label of labels) {
        if (!re.test(label.textContent ?? '')) continue
        const container = label.parentElement
        if (!container) continue
        const input = container.querySelector('input, textarea, select') as
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
        if (!input) continue
        const proto =
          input.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype
            : input.tagName === 'SELECT'
              ? HTMLSelectElement.prototype
              : HTMLInputElement.prototype
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
        setter?.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
        count++
      }
      return count
    },
    { source: regex.source, value },
  )
}

async function readByLabel(page: Page, regex: RegExp): Promise<string | null> {
  return page.evaluate(
    ({ source }) => {
      const re = new RegExp(source, 'i')
      const labels = Array.from(document.querySelectorAll('label')) as HTMLLabelElement[]
      for (const label of labels) {
        if (!re.test(label.textContent ?? '')) continue
        const container = label.parentElement
        if (!container) continue
        const input = container.querySelector('input, textarea') as
          HTMLInputElement | HTMLTextAreaElement | null
        if (input) return input.value
      }
      return null
    },
    { source: regex.source },
  )
}

test.describe('Settings persistence', () => {
  test('Profile updates (phone, bio) persist via oauthData and survive reload', async ({
    page,
  }) => {
    await signup(page)
    const token = await getAccessToken(page)
    expect(token).toBeTruthy()

    await page.goto('/admin/settings')
    await page.waitForLoadState('networkidle')

    const uniquePhone = `+1555${Date.now().toString().slice(-7)}`
    const uniqueBio = `Bio set in test at ${new Date().toISOString()}`

    expect(await fillByLabel(page, /phone number|^phone$/, uniquePhone)).toBeGreaterThan(0)
    expect(await fillByLabel(page, /^bio|professional bio|about/, uniqueBio)).toBeGreaterThan(0)

    // Submit profile changes. Multiple "Save" buttons exist on this page
    // (profile, password). Click the first non-disabled one in the
    // profile section. The profile slice (phone, bio, notifications) is
    // persisted through the app-owned PATCH /api/settings channel — the
    // platform User resource drops `oauthData` on writes and never returns
    // it on reads.
    const savePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === 'PATCH' &&
        new URL(resp.url()).pathname.startsWith('/api/settings'),
      { timeout: 10_000 },
    )
    await page
      .getByRole('button', { name: /save changes|save profile|^save$/i })
      .first()
      .click()
    const saveResp = await savePromise
    expect(saveResp.status(), `PATCH /api/settings => ${saveResp.status()}`).toBeLessThan(300)

    // Verify via the settings API.
    const ctx = await apiContext()
    const apiResp = await ctx.get(`${API_BASE}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(apiResp.ok(), `GET /api/settings => ${apiResp.status()}`).toBe(true)
    const body = (await apiResp.json()) as {
      data?: { phone?: string; bio?: string }
      phone?: string
      bio?: string
    }
    const profile = body.data ?? body
    expect(profile?.phone, 'phone should persist via /api/settings').toBe(uniquePhone)
    expect(profile?.bio, 'bio should persist via /api/settings').toBe(uniqueBio)

    // Reload and confirm the form re-hydrates.
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_500)
    const phoneAfter = await readByLabel(page, /phone number|^phone$/)
    expect(phoneAfter).toBe(uniquePhone)
    const bioAfter = await readByLabel(page, /^bio|professional bio|about/)
    expect(bioAfter).toBe(uniqueBio)
  })
})
