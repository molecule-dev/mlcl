/**
 * `fetchPublishedReadme`: a package's whole published README, from the `latest` tarball. npm cuts
 * a packument's `readme` at 65,536 characters, so `mlcl docs @molecule/app-react --section useLogin`
 * (README 123 kB, the section past the cut) failed in the scaffold eval of 2026-11-23.
 */
import { describe, expect, it, vi } from 'vitest'

import { fetchPublishedReadme } from '../package-doc-files.js'
import { PACKUMENT_README_LIMIT, PUBLIC_REGISTRY, registryFetch } from './helpers/npm-registry.js'

const longReadme = (): string =>
  `# @molecule/app-long\n\n${'a line of the API reference\n'.repeat(Math.ceil(PACKUMENT_README_LIMIT / 28) + 50)}\n## Late\n\nPast the cut.\n`

describe('fetchPublishedReadme', () => {
  it('returns the whole README from the tarball, past the packument cut', async () => {
    const readme = longReadme()
    expect(readme.length).toBeGreaterThan(PACKUMENT_README_LIMIT)
    const fetchImpl = vi.fn(registryFetch({ readme, version: '2.0.1' }))
    const published = await fetchPublishedReadme('app-long', {
      registry: PUBLIC_REGISTRY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(published).toEqual({ readme, version: '2.0.1' })
    expect(fetchImpl.mock.calls.map((call) => String(call[0]))).toEqual([
      `${PUBLIC_REGISTRY}@molecule%2Fapp-long/latest`,
      `${PUBLIC_REGISTRY}@molecule/app-long/-/app-long-2.0.1.tgz`,
    ])
  })

  it('refuses a tarball that does not match its integrity', async () => {
    const fetchImpl = registryFetch({ readme: '# Doc\n', badIntegrity: true })
    await expect(
      fetchPublishedReadme('app-tampered', {
        registry: PUBLIC_REGISTRY,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/does not match its integrity/)
  })

  it('never downloads a tarball from another origin, and reads the packument instead', async () => {
    const readme = '# Doc\n\nFrom the packument.\n'
    const fetchImpl = vi.fn(registryFetch({ readme, tarballOrigin: 'https://elsewhere.example' }))
    const published = await fetchPublishedReadme('app-elsewhere', {
      registry: PUBLIC_REGISTRY,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(published).toEqual({ readme, version: '1.0.0' })
    const urls = fetchImpl.mock.calls.map((call) => String(call[0]))
    expect(urls.some((url) => url.startsWith('https://elsewhere.example'))).toBe(false)
    expect(urls).toEqual([
      `${PUBLIC_REGISTRY}@molecule%2Fapp-elsewhere/latest`,
      `${PUBLIC_REGISTRY}@molecule%2Fapp-elsewhere`,
    ])
  })

  it('answers null for a package the registry does not have, and throws on any other error', async () => {
    const missing = registryFetch(null)
    expect(
      await fetchPublishedReadme('app-missing', {
        registry: PUBLIC_REGISTRY,
        fetchImpl: missing as unknown as typeof fetch,
      }),
    ).toBeNull()
    const outage = async (): Promise<Response> => new Response('{}', { status: 503 })
    await expect(
      fetchPublishedReadme('app-outage', {
        registry: PUBLIC_REGISTRY,
        fetchImpl: outage as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/HTTP 503/)
  })
})
