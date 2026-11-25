/**
 * `mlcl add --capability "<words>"` (and MCP `add_package` with `query`) adds the package the words
 * decide, or lists candidates and adds nothing. Asked to add a capability, both harnesses searched
 * and added in a second model turn (harness eval `add`, 2026-11-25).
 */
import { describe, expect, it } from 'vitest'

import { toSearchEntry } from '../../commands/search.js'
import { manifestStack, resolveCapability } from '../capability-add.js'
import type { SearchSourceEntry } from '../package-search.js'
import { loadAppFrameworks, loadRegistry } from '../registry.js'

const registry = (): SearchSourceEntry[] => loadRegistry().map(toSearchEntry)

const resolved = (
  query: string,
  context: Parameters<typeof resolveCapability>[2] = { stack: 'api' },
): string => {
  const result = resolveCapability(registry(), query, {
    appFrameworks: loadAppFrameworks(),
    ...context,
  })
  return 'name' in result
    ? result.name
    : `choices: ${result.choices.map((hit) => hit.name).join(' ')}`
}

describe('resolveCapability against the registry', () => {
  it('an interface the words name, with its default provider (OLD MUSTFAIL)', () => {
    expect(resolved('file uploads')).toBe('@molecule/api-uploads')
    expect(resolved('file uploads storage multipart')).toBe('@molecule/api-uploads')
    expect(resolved('cors')).toBe('@molecule/api-middleware-cors')
  })

  it('a vendor the words name', () => {
    expect(resolved('Resend')).toBe('@molecule/api-emails-resend')
    expect(resolved('send emails with resend')).toBe('@molecule/api-emails-resend')
    expect(resolved('image uploads to s3')).toBe('@molecule/api-uploads-s3')
    expect(resolved('stripe payments')).toBe('@molecule/api-payments-stripe')
  })

  it('a vendor of several interfaces needs its interface named: redis alone lists them', () => {
    expect(resolved('redis cache')).toBe('@molecule/api-cache-redis')
    expect(resolved('redis')).toMatch(
      /^choices: .*@molecule\/api-cache-redis.*@molecule\/api-queue-redis/,
    )
  })

  it("a generic word that is also another interface's provider name is not a vendor", () => {
    // api-audit-file and api-paracrine-file are providers named `file`.
    expect(resolved('file uploads')).toBe('@molecule/api-uploads')
    // api-audit-database and others are providers named `database`.
    expect(resolved('database')).toBe('@molecule/api-database')
  })

  it("the project's own provider for the interface keeps the default out", () => {
    const result = resolveCapability(registry(), 'database', {
      stack: 'api',
      declared: ['@molecule/api-database-sqlite'],
    })
    expect(result).toEqual({
      name: '@molecule/api-database',
      because: "the project's @molecule/api-database-sqlite provides it",
    })
  })

  it('counterexample: an interface with no default lists its providers and adds nothing', () => {
    const result = resolveCapability(registry(), 'transactional email', { stack: 'api' })
    expect('choices' in result && result.because).toBe(
      '@molecule/api-emails has no default provider: name the one to use',
    )
    expect('choices' in result && result.choices.map((hit) => hit.name)).toContain(
      '@molecule/api-emails-resend',
    )
  })

  it('counterexample: a full-stack root asked for "file uploads" lists both halves', () => {
    expect(resolved('file uploads', {})).toBe(
      'choices: @molecule/api-uploads @molecule/app-file-upload',
    )
  })

  it('counterexample: words that match nothing list nothing', () => {
    expect(resolveCapability(registry(), 'zzqx', { stack: 'api' })).toEqual({
      choices: [],
      because: 'no package matches "zzqx"',
    })
  })
})

describe('resolveCapability on a stub registry', () => {
  const stub: SearchSourceEntry[] = [
    {
      name: '@molecule/api-widgets',
      stack: 'api',
      type: 'core',
      label: 'Widgets',
      defaultProvider: '@molecule/api-widgets-acme',
    },
    {
      name: '@molecule/api-widgets-acme',
      stack: 'api',
      type: 'provider',
      implements: '@molecule/api-widgets',
      label: 'Acme',
    },
    {
      name: '@molecule/api-widgets-zeta',
      stack: 'api',
      type: 'provider',
      implements: '@molecule/api-widgets',
      label: 'Zeta',
    },
    { name: '@molecule/api-profiles', stack: 'api', type: 'core', label: 'Profiles' },
  ]

  it('words count whole: "widget" names widgets, "profile" names profiles, "file" names neither', () => {
    expect(resolveCapability(stub, 'a widget', { stack: 'api' })).toMatchObject({
      name: '@molecule/api-widgets',
    })
    expect(resolveCapability(stub, 'zeta widgets', { stack: 'api' })).toMatchObject({
      name: '@molecule/api-widgets-zeta',
    })
    expect('choices' in resolveCapability(stub, 'file', { stack: 'api' })).toBe(true)
  })

  it('a replaced default is not added', () => {
    const replaced = stub.map((entry) =>
      entry.name === '@molecule/api-widgets-acme'
        ? { ...entry, replacedBy: '@molecule/api-widgets-zeta' }
        : entry,
    )
    expect(resolveCapability(replaced, 'widgets', { stack: 'api' })).toMatchObject({
      because: '@molecule/api-widgets has no default provider: name the one to use',
    })
  })
})

describe('manifestStack', () => {
  it('reads the stack from the dependencies', () => {
    expect(manifestStack({ dependencies: { express: '5.2.1' } })).toBe('api')
    expect(manifestStack({ dependencies: { react: '19.2.4' } })).toBe('app')
    expect(manifestStack({ molecule: { framework: 'vue' } })).toBe('app')
    expect(manifestStack({ dependencies: { '@molecule/api-bond': '1.0.0' } })).toBe('api')
  })

  it('counterexample: both or neither decides nothing', () => {
    expect(manifestStack({ dependencies: { express: '5.2.1', react: '19.2.4' } })).toBeUndefined()
    expect(manifestStack({ dependencies: { lodash: '4.17.21' } })).toBeUndefined()
  })
})
