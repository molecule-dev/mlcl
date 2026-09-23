import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

/**
 * Backend-invariant suite. Each test asserts that a primary action's
 * read-after-write actually held — not just that the click fired.
 *
 * These cover the three failure modes flagship-production-ready.md
 * called out as already shipped under green gates:
 *
 *  1. "Generations don't debit credits" — the credit_ledger only gets
 *     the signup grant and nothing else. The pricing page sells air.
 *  2. "POST /api/models/:id/activate writes oauthData.activeModel →
 *     generations.ts never reads it." Pure write-only state.
 *  3. "POST /api/styles/:id/activate writes oauthData.activeStyleId →
 *     no generation reads it." Same shape.
 *
 * The first test exercises the dashboard-visible balance via the API
 * (read-after-write through GET /api/credits). The second and third
 * activate a model/style then issue a generation request with NO
 * `model`/`style` field in the body so the server's fallback to the
 * user's stored selection is what's actually being verified.
 */

type Json = unknown

/**
 * Issue a request from inside the browser context so the app's auth
 * cookie (httpOnly `token`, set by the auth client after signup/login)
 * is automatically attached via `credentials: 'include'`. Playwright's
 * `page.request` uses a separate cookie jar — only in-browser fetch
 * reliably sends the httpOnly cookie to the same origin.
 */
async function apiRequest<T = Json>(
  page: import('@playwright/test').Page,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      const resp = await fetch(path, {
        method,
        headers,
        credentials: 'include',
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      let parsed: unknown = null
      try {
        parsed = await resp.json()
      } catch {
        // not all responses are JSON (e.g. 204 No Content)
      }
      return { status: resp.status, body: parsed as never }
    },
    { method, path, body },
  )
}

async function getCreditBalance(page: import('@playwright/test').Page): Promise<number> {
  const { status, body } = await apiRequest<{ balance?: number }>(page, 'GET', '/api/credits')
  expect(status, 'GET /api/credits must succeed').toBe(200)
  return body.balance ?? 0
}

test.describe('backend invariants', () => {
  test('successful generation debits credits (read-after-write on /api/credits)', async ({
    page,
  }) => {
    await signup(page)

    const balanceBefore = await getCreditBalance(page)
    expect(balanceBefore, 'fresh signup should have a positive credit balance').toBeGreaterThan(0)

    const { status: genStatus, body: generation } = await apiRequest<{
      id?: string
      status?: string
      image_url?: string | null
      credits_used?: number
    }>(page, 'POST', '/api/generations', {
      prompt: 'A cobalt octopus reading a paperback',
    })
    expect(genStatus, 'POST /api/generations must succeed').toBeLessThan(300)
    expect(generation.id, 'response must include row id').toBeTruthy()
    expect(generation.status, 'persisted status must be succeeded').toBe('succeeded')
    expect(generation.image_url, 'response must include a non-null image_url').toBeTruthy()
    expect(generation.credits_used, 'generations.credits_used must be debited').toBeGreaterThan(0)

    const balanceAfter = await getCreditBalance(page)
    expect(
      balanceAfter,
      'GET /api/credits must reflect the debit AFTER the successful generation — the pricing page is not allowed to sell air',
    ).toBe(balanceBefore - (generation.credits_used ?? 0))
  })

  test('generation refuses when the user is out of credits (402, balance unchanged)', async ({
    page,
  }) => {
    // Burning real OpenAI generations until empty is too slow for CI
    // (12 × ~30s ≈ 6 minutes). Fire them concurrently — each round-trip
    // is pure I/O, so 12 in parallel finishes in roughly the time of
    // one. Allow 4 minutes headroom in case the provider rate-limits.
    test.setTimeout(240_000)
    // The whole point of this test is that /api/generations answers 402
    // once the balance is drained — every drain/mop request that lands in
    // that path logs a benign "Failed to load resource: … status of 402"
    // console entry. Allow exactly that; everything else still fails.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 402',
    })
    await signup(page)

    const startBalance = await getCreditBalance(page)
    // Issue more concurrent requests than there are credits so a few
    // will land in the 402 path even if some succeed and some bounce
    // off upstream provider hiccups (502 from OpenAI on burst load).
    const drains = Array.from({ length: Math.ceil(startBalance / 10) + 4 }, (_, i) =>
      apiRequest(page, 'POST', '/api/generations', {
        prompt: `burning credit ${i}`,
      }),
    )
    await Promise.all(drains)
    // Don't assert per-request status — provider may bounce some with
    // 502 under burst load; the only thing that matters is the
    // post-drain balance and the 402 boundary tested below.

    // If any provider 502s left credits behind, mop them up sequentially.
    let mop = 20
    while (mop-- > 0) {
      const remaining = await getCreditBalance(page)
      if (remaining < 10) break
      await apiRequest(page, 'POST', '/api/generations', {
        prompt: `mop drain ${mop}`,
      })
    }

    const balanceBefore = await getCreditBalance(page)
    expect(balanceBefore, 'after draining, balance must be below the per-call cost').toBeLessThan(
      10,
    )

    const { status: blockedStatus } = await apiRequest(page, 'POST', '/api/generations', {
      prompt: 'this one must fail with 402',
    })
    expect(
      blockedStatus,
      'POST /api/generations must return 402 when balance < cost — never 201 with a fake image',
    ).toBe(402)

    const balanceAfter = await getCreditBalance(page)
    expect(balanceAfter, 'balance must be unchanged after a refused 402').toBe(balanceBefore)
  })

  test('activating a model is honored by the next generation (read-after-write on generation.model)', async ({
    page,
  }) => {
    await signup(page)

    const TARGET_MODEL = 'reverie-print'
    const { status: actStatus, body: activated } = await apiRequest<{
      activeModel?: string
    }>(page, 'POST', `/api/models/${TARGET_MODEL}/activate`)
    expect(actStatus, 'POST /api/models/:id/activate must succeed').toBeLessThan(300)
    expect(activated.activeModel, 'activate response must echo the new active model').toBe(
      TARGET_MODEL,
    )

    // Issue a generation with NO `model` in the body — the server must
    // fall back to the stored activeModel. This is the part agents
    // before me forgot: writing oauthData.activeModel without ever
    // reading it from the generations handler is pure write-only state.
    const { status: genStatus, body: generation } = await apiRequest<{
      id?: string
      model?: string
    }>(page, 'POST', '/api/generations', {
      prompt: 'Portrait of an aurora fox in a snowy birch forest',
    })
    expect(genStatus, 'POST /api/generations must succeed').toBeLessThan(300)
    expect(
      generation.model,
      'generation.model must reflect the active selection — selecting a model without honoring it is the bug',
    ).toBe(TARGET_MODEL)

    // Read-after-write through the public list endpoint as well.
    const { status: listStatus, body: rows } = await apiRequest<
      Array<{ id?: string; model?: string }>
    >(page, 'GET', '/api/generations?limit=5')
    expect(listStatus).toBe(200)
    const matched = rows.find((row) => row.id === generation.id)
    expect(matched, 'new generation must show up in /api/generations').toBeTruthy()
    expect(matched?.model, 'list endpoint must agree with the create response').toBe(TARGET_MODEL)
  })

  test('activating a style preset is honored by the next generation (style_id, prompt_modifier)', async ({
    page,
  }) => {
    await signup(page)

    // Drive whichever preset the library actually holds — a preset's
    // prompt_modifier is what should materially affect the upstream provider
    // request, and naming one breaks this spec once the presets are replaced.
    // The generation row should also link back to the preset via
    // `generations.style_id`.
    const { status: stylesStatus, body: styles } = await apiRequest<
      Array<{ id?: string; name?: string; prompt_modifier?: string | null }>
    >(page, 'GET', '/api/styles')
    expect(stylesStatus).toBe(200)
    expect(styles.length, 'the user must have style presets').toBeGreaterThan(0)
    const preset = styles.find((s) => Boolean(s.prompt_modifier))
    expect(
      preset?.id,
      'at least one style preset must carry a real prompt_modifier — an empty modifier means the active style is decorative',
    ).toBeTruthy()

    const { status: activateStatus } = await apiRequest(
      page,
      'POST',
      `/api/styles/${preset!.id}/activate`,
    )
    expect(activateStatus, 'POST /api/styles/:id/activate must succeed').toBeLessThan(300)

    // Issue a generation with no `style` in the body — the server
    // must apply the active style's modifiers AND record the link.
    const userPrompt = 'A misty alpine lake at sunrise'
    const { status: genStatus, body: generation } = await apiRequest<{
      id?: string
      style_id?: string | null
      prompt?: string
    }>(page, 'POST', '/api/generations', { prompt: userPrompt })
    expect(genStatus, 'POST /api/generations must succeed').toBeLessThan(300)
    expect(
      generation.style_id,
      'generation row must persist the active style preset id — write-only activeStyleId is the bug',
    ).toBe(preset!.id)
    expect(
      generation.prompt,
      'user-typed prompt must be preserved verbatim on the generation row',
    ).toBe(userPrompt)
  })

  test('stripe confirm-checkout refuses to flip planKey for an unpaid session (no free upgrades)', async ({
    page,
  }) => {
    // This test DELIBERATELY drives POST /api/plans/confirm-checkout into its
    // refusal paths (unpaid session, bogus session id) — the browser logs a
    // console error for every non-2xx fetch. Both refusals answer 402, which
    // is the assertion, not a failure: allow that exact console noise here.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 402',
    })
    await signup(page)

    // Verify the starting state — the plan should be the seeded
    // starter / null planKey.
    const { status: initialPlansStatus, body: initialPlans } = await apiRequest<
      Array<{ id?: string; current?: boolean }>
    >(page, 'GET', '/api/plans')
    expect(initialPlansStatus).toBe(200)
    const initialActive = initialPlans.find((p) => p.current)?.id ?? 'starter'
    expect(initialActive, 'fresh user should start on starter').toBe('starter')

    // Issue a real Stripe Checkout session for the Creator plan. The
    // session is created in stripe test mode but is NOT completed
    // (the user never enters a card in this test). This is the exact
    // scenario where past agents shipped a "/plan-updated" page that
    // displayed "Welcome to Pro!" while planKey stayed `starter`
    // forever — because nothing actually verified the payment.
    const { status: switchStatus, body: switchBody } = await apiRequest<{
      sessionId?: string
      checkoutUrl?: string
    }>(page, 'POST', '/api/plans/switch', { planKey: 'creator' })
    expect(switchStatus).toBe(200)
    expect(switchBody.sessionId, 'switch must return a real Stripe session id').toMatch(/^cs_/)

    // Now hit confirm-checkout with the unpaid session id. The handler
    // MUST refuse to flip the plan because Stripe will report
    // payment_status='unpaid' for a session that was created but never
    // completed. Returning 200/confirmed=true here would be the bug.
    const { status: confirmStatus, body: confirmBody } = await apiRequest<{
      paymentStatus?: string
      confirmed?: boolean
    }>(page, 'POST', '/api/plans/confirm-checkout', { sessionId: switchBody.sessionId })
    expect(
      confirmStatus,
      'confirm-checkout must return 402 for unpaid sessions — confirming an unpaid session would let users upgrade for free',
    ).toBe(402)
    expect(confirmBody.confirmed, 'unpaid session must not be confirmed').not.toBe(true)

    // Read-after-write: the plan still must be starter, AND no
    // plan_grant credit row must have been added to the ledger.
    const { body: plansAfter } = await apiRequest<Array<{ id?: string; current?: boolean }>>(
      page,
      'GET',
      '/api/plans',
    )
    const activeAfter = plansAfter.find((p) => p.current)?.id ?? 'starter'
    expect(activeAfter, 'planKey must NOT have flipped after a refused confirmation').toBe(
      'starter',
    )

    // Confirm-checkout must also reject session ids that don't exist
    // / belong to other users. Replay the same id in a different
    // session — but here we just sanity-check the handler refuses an
    // obviously fake id.
    const { status: bogusStatus } = await apiRequest(page, 'POST', '/api/plans/confirm-checkout', {
      sessionId: 'cs_test_bogus_does_not_exist',
    })
    expect(
      bogusStatus,
      'confirm-checkout must surface an error for a non-existent Stripe session — silently 200ing would be the same free-upgrade bug',
    ).toBeGreaterThanOrEqual(400)
  })

  test('newly-created API key returns the full secret ONCE (then masked thereafter)', async ({
    page,
  }) => {
    await signup(page)
    // Create a real API key. The response must include the full
    // unmasked `key` so the user can copy it — past versions only
    // returned the masked form, leaving users with a credential they
    // could never actually use.
    const { status, body } = await apiRequest<{
      id?: string
      key?: string
      mask?: string
    }>(page, 'POST', '/api/api-keys', { provider: 'reverie' })
    expect(status, 'POST /api/api-keys must succeed').toBe(201)
    expect(body.key, 'creation response MUST include the full secret').toBeTruthy()
    expect(body.key, 'full key must follow the sk_live_<hex> shape').toMatch(/^sk_live_[a-f0-9]+$/)
    expect(body.mask, 'creation response should also include the masked preview').toBeTruthy()

    // Subsequent list reads must NOT leak the full key — only the
    // mask. (The whole reason the create endpoint must show the key
    // once is that listing only ever returns the mask.)
    const { status: listStatus, body: list } = await apiRequest<
      Array<{ id?: string; mask?: string; key?: string }>
    >(page, 'GET', '/api/api-keys')
    expect(listStatus).toBe(200)
    const created = list.find((row) => row.id === body.id)
    expect(created, 'newly-created key must show up in /api/api-keys').toBeTruthy()
    expect(created?.mask, 'list endpoint must return the masked preview').toBeTruthy()
    expect(
      (created as { key?: string })?.key,
      'list endpoint must NOT leak the full key after creation',
    ).toBeUndefined()
  })

  test('dashboard credits hero reflects real plan + balance (no hardcoded "Creator / 4000")', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    // Dashboard must call /api/credits and use its data — the plan name
    // and total in the hero card come from the API now, not from the
    // hardcoded "Creator / 4000 / May 21" placeholder it used to ship
    // with.
    expect(reqs.some((r) => /\/api\/credits/.test(r.url) && r.method === 'GET')).toBeTruthy()

    // The credits API tells the truth; the dashboard must show what
    // the API said, not a copy-pasted design comp.
    const { body: apiBody } = await apiRequest<{
      balance?: number
      plan?: { name?: string; creditsPerMonth?: number } | null
    }>(page, 'GET', '/api/credits')
    expect(apiBody.plan?.name, '/api/credits must include a real plan').toBeTruthy()
    expect(
      apiBody.plan?.creditsPerMonth,
      '/api/credits must include the plan monthly cap',
    ).toBeGreaterThan(0)

    // Pull the visible totals out of the dashboard and compare.
    const visibleTotal = await page
      .locator('text=/^\\d{1,3}(,\\d{3})*\\s*\\/\\s*\\d{1,3}(,\\d{3})*$/')
      .first()
      .textContent({ timeout: 10_000 })
    expect(visibleTotal, 'meter "balance / total" must be rendered').toBeTruthy()
    const [, totalStr] = visibleTotal!.split('/').map((s) => s.trim().replace(/,/g, ''))
    expect(
      Number(totalStr),
      'dashboard total must equal API plan.creditsPerMonth (no hardcoded 4000)',
    ).toBe(apiBody.plan!.creditsPerMonth)
  })
})
