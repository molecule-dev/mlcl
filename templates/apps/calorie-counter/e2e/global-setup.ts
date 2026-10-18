/**
 * Runs once before the specs: fails the whole run in a few seconds when
 * nothing answers at the URL the specs will open.
 *
 * Without it every test spends its navigation timeout AND its expect timeout
 * on a server that was never started or sits on another port — ten tests cost
 * four minutes to say "connection refused" ten times — and the error names the
 * assertion, never the cause. The preview bond is exempt: there the page comes
 * from the IDE tab and `baseURL` is not used.
 */
import type { FullConfig } from '@playwright/test'

import { resolveE2EProviderName } from '@molecule/app-e2e'

export default async function globalSetup(config: FullConfig): Promise<void> {
  if (resolveE2EProviderName() === 'preview') return
  // The helpers honour APP_BASE over the config's baseURL; probe what they use.
  const target = process.env.APP_BASE || config.projects[0]?.use?.baseURL
  if (!target) return
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3_000)
  try {
    await fetch(target, { signal: controller.signal, redirect: 'manual' })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Nothing answers at ${target} (${reason}). Start the app first — \`npm run dev\`, or ` +
        '`npm run build && npm run preview` for the built site — or point the specs at a ' +
        'running server with APP_BASE=http://localhost:<port>. Inside a molecule sandbox the ' +
        'dev server is already running on port 5173.',
      { cause: error },
    )
  } finally {
    clearTimeout(timer)
  }
}
