import { expect, test, type Page } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiContext, getAccessToken, signup, unwrapList } from './_helpers.js'

/**
 * Walk every <label> on the page and fill the input/textarea inside the
 * SAME parent container with `value` if the label text matches `regex`.
 * Returns the count of fills performed (so the caller can assert).
 */
async function fillByLabel(page: Page, regex: RegExp, value: string): Promise<number> {
  return page.evaluate(
    ({ source, value }) => {
      const re = new RegExp(source, 'i')
      const labels = Array.from(document.querySelectorAll('label')) as HTMLLabelElement[]
      let count = 0
      for (const label of labels) {
        if (!re.test(label.textContent ?? '')) continue
        // Find the input/textarea/select inside the label's parent.
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

test.describe('Agent listing CRUD (read-after-write)', () => {
  test('Create listing → appears in listings → edit → delete → gone', async ({ page }) => {
    await signup(page)
    const ctx = await apiContext()
    const token = (await getAccessToken(page)) as string
    expect(token).toBeTruthy()

    await page.goto('/admin/listings/new')
    await page.waitForLoadState('networkidle')

    const uniqueTitle = `Test Listing ${Date.now()}`
    const uniqueAddress = `${Math.floor(Math.random() * 9999)} Test Lane`

    expect(await fillByLabel(page, /^listing title/, uniqueTitle)).toBeGreaterThan(0)
    expect(await fillByLabel(page, /^street address/, uniqueAddress)).toBeGreaterThan(0)
    expect(await fillByLabel(page, /^city$/, 'Aspen')).toBeGreaterThan(0)
    expect(await fillByLabel(page, /^zip|postal/, '81611')).toBeGreaterThan(0)
    expect(await fillByLabel(page, /^price/, '1250000')).toBeGreaterThan(0)
    expect(await fillByLabel(page, /^bedrooms?$/, '3')).toBeGreaterThan(0)
    expect(await fillByLabel(page, /^bathrooms?$/, '2')).toBeGreaterThan(0)
    expect(await fillByLabel(page, /^square feet/, '2000')).toBeGreaterThan(0)
    // Description lives in the rich-text-ish section; fill any textarea
    // whose label mentions description, or the largest textarea on page.
    let descFilled = await fillByLabel(page, /description|about/, 'A beautiful test listing.')
    if (descFilled === 0) {
      descFilled = await page.evaluate(() => {
        const ta = document.querySelector('textarea') as HTMLTextAreaElement | null
        if (!ta) return 0
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        setter?.call(ta, 'A beautiful test listing.')
        ta.dispatchEvent(new Event('input', { bubbles: true }))
        ta.dispatchEvent(new Event('change', { bubbles: true }))
        return 1
      })
    }
    expect(descFilled).toBeGreaterThan(0)

    const postPromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === 'POST' && new URL(resp.url()).pathname === '/api/properties',
      { timeout: 10_000 },
    )
    await page
      .getByRole('button', { name: /publish listing|publish|save listing/i })
      .first()
      .click()

    const postResp = await postPromise
    expect(
      postResp.status(),
      `POST /api/properties => ${postResp.status()} ${await postResp.text().catch(() => '')}`,
    ).toBeLessThan(300)

    const apiResp = await ctx.get(`${API_BASE}/properties?owner_id=me&status=all&limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(apiResp.ok()).toBe(true)
    const apiList = unwrapList<{ id: string; title?: string; price?: number | string }>(
      await apiResp.json(),
    )
    const created = apiList.find((p) => p.title === uniqueTitle)
    expect(created, `created listing should be retrievable via API`).toBeTruthy()
    expect(Number(created!.price)).toBe(1250000)

    // Edit: change the price.
    await page.goto(`/admin/listings/${created!.id}/edit`)
    await page.waitForLoadState('networkidle')
    expect(await fillByLabel(page, /^price/, '999999')).toBeGreaterThan(0)
    const putPromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === 'PUT' &&
        /\/api\/properties\/[a-f0-9-]+/.test(new URL(resp.url()).pathname),
      { timeout: 10_000 },
    )
    await page
      .getByRole('button', { name: /publish listing|publish|save listing|save changes|update/i })
      .first()
      .click()
    const putResp = await putPromise
    expect(putResp.status()).toBeLessThan(300)

    const reread = await ctx.get(`${API_BASE}/properties/${created!.id}`)
    const rereadBody = (await reread.json()) as {
      price?: number | string
      data?: { price?: number | string }
    }
    const updated = rereadBody.data ?? rereadBody
    expect(Number(updated.price)).toBe(999999)

    // Delete via API and verify.
    const delResp = await ctx.delete(`${API_BASE}/properties/${created!.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(delResp.ok(), `DELETE => ${delResp.status()}`).toBe(true)
    const finalResp = await ctx.get(`${API_BASE}/properties/${created!.id}`)
    expect([404, 410]).toContain(finalResp.status())
  })
})
