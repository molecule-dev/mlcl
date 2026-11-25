/**
 * A resource's editable router carries a feature router's code only with its feature, and a later
 * inject that brings the feature adds it to the project's file.
 *
 * In the r18 scaffold eval (2026-11-24) every custom stack without an email transport, two-factor,
 * payments or OAuth provider still carried all four routers in `handlers/auth.ts` as exported,
 * unmounted code, and Codex rewrote the file to delete them. Read against the user resource's real
 * router source; every output is checked against Prettier, which the scaffold lints with.
 *
 * @module
 */
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  featureRouterName,
  routerWithAddedFeatures,
  routerWithFeatures,
} from '../feature-routers.js'
import { formatGeneratedSource } from '../format.js'
import { getRawRegistry } from '../registry.js'

const user = getRawRegistry().packages['@molecule/api-resource-user']!
const SOURCE = user.expressRouter!
const FEATURES = [
  ...new Set(user.routes!.flatMap((route) => (route.optional ? [route.optional] : []))),
]
const ROUTERS = FEATURES.map(featureRouterName)

/** The exported feature routers a router file declares. */
const exported = (text: string): string[] =>
  ROUTERS.filter((name) => new RegExp(`export const ${name} = Router\\(\\)`).test(text))

/** Whether Prettier leaves the text as it is. */
const formatted = async (text: string): Promise<boolean> =>
  (await formatGeneratedSource(text, join('src', 'handlers', 'auth.ts'))) === text

describe("the user resource's feature routers", () => {
  it('are the four its routes mark', () => {
    expect(ROUTERS.sort()).toEqual([
      'emailsRouter',
      'oauthRouter',
      'paymentsRouter',
      'twoFactorRouter',
    ])
    expect(exported(SOURCE).sort()).toEqual([...ROUTERS].sort())
  })

  it('are left out, with what only they use, when the stack has none (OLD MUSTFAIL)', async () => {
    const none = routerWithFeatures(SOURCE, FEATURES, new Set())
    expect(exported(none)).toEqual([])
    // Two-factor's own rate limit is read by its router alone.
    expect(none).not.toContain('rateLimitTwoFactor')
    expect(none).not.toContain('requireWebhookAuthenticity')
    // The account routes stay.
    for (const path of ["'/users'", "'/users/log-in'", "'/users/:id/password'"])
      expect(none).toContain(path)
    expect(none).toContain('export default router')
    expect(await formatted(none)).toBe(true)
  })

  it('keep exactly the features the stack has', async () => {
    const emails = routerWithFeatures(SOURCE, FEATURES, new Set(['emails']))
    expect(exported(emails)).toEqual(['emailsRouter'])
    expect(await formatted(emails)).toBe(true)
    expect(routerWithFeatures(SOURCE, FEATURES, new Set(FEATURES))).toBe(SOURCE)
  })

  it("are added to the project's own file when a later inject brings their feature", async () => {
    const none = routerWithFeatures(SOURCE, FEATURES, new Set())
    // The project edited its copy; the edit stays.
    const edited = none.replace(
      "router.post('/users/logout'",
      "// Our note.\nrouter.post('/users/logout'",
    )
    const added = routerWithAddedFeatures(edited, SOURCE, FEATURES, new Set(['two-factor']))!
    expect(exported(added)).toEqual(['twoFactorRouter'])
    expect(added).toContain('// Our note.')
    expect(added).toContain('const rateLimitTwoFactor = authorizers.rateLimit(')
    expect(added.indexOf('twoFactorRouter = Router()')).toBeLessThan(
      added.indexOf('export default router'),
    )
    expect(await formatted(added)).toBe(true)
    // Nothing is added twice.
    expect(
      routerWithAddedFeatures(added, SOURCE, FEATURES, new Set(['two-factor'])),
    ).toBeUndefined()
  })

  it('counterexample: a router without feature routers is written as it is', () => {
    const plain =
      "import { Router } from 'express'\n\nconst router = Router()\n\nexport default router\n"
    expect(routerWithFeatures(plain, FEATURES, new Set())).toBe(plain)
    expect(routerWithAddedFeatures(plain, plain, FEATURES, new Set(FEATURES))).toBeUndefined()
  })
})
