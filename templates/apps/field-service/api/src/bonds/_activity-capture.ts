/**
 * Activity-capture producer wiring (molecule.dev managed sandbox).
 *
 * The PRODUCER half of the activity surface (docs/BAAS-activity.md §3-4). When
 * this app runs inside the molecule.dev IDE, the platform injects
 * `MOLECULE_ACTIVITY_URL` (+ `MOLECULE_VAULT_TOKEN` / `MOLECULE_APP_ID` /
 * `MOLECULE_ACTIVITY_MODE`) into the container env. `setupActivityCapture()` —
 * called last in `setupBonds()` — reads that env and, ONLY when
 * `MOLECULE_ACTIVITY_URL` is present:
 *
 *  1. bonds the HTTP activity sink (`@molecule/api-activity-http`) so every
 *     `record()` POSTs the event to the IDE's `/v1/activity` ingest endpoint;
 *  2. routes each ALREADY-bonded capturable provider (email / sms / push /
 *     webhook / channel) through its capture provider — in one of TWO MODES.
 *
 * ## The two modes — `MOLECULE_ACTIVITY_MODE`
 *
 * - `intercept` (the default): the real provider is REPLACED by the
 *   intercept-only capture provider. A `sendMail()` / webhook dispatch / push is
 *   recorded and returns a synthetic success, and NOTHING is actually delivered.
 *   This is the molecule.dev dev experience — "captured, not delivered" — and it
 *   is what a dev sandbox gets.
 * - `tee`: the real provider is WRAPPED by the capture provider. The side effect
 *   is really DELIVERED through the app's own provider AND recorded with its
 *   real outcome. This is what a PRODUCTION deploy gets: a deployed app must
 *   really send its emails, so production side effects are teed, never
 *   intercepted.
 *
 * The mode is read from the platform-provided env rather than guessed from
 * `NODE_ENV`, so the platform stays the single authority on it. Any unset or
 * unrecognized value means `intercept`, which leaves the dev default unchanged.
 *
 * If a category's capture wiring cannot be honoured — the capture package is
 * missing, or too old to expose its tee factory — that category keeps its REAL
 * provider bonded and is simply not captured. Delivering for real always wins
 * over capturing.
 *
 * Outside the IDE (no `MOLECULE_ACTIVITY_URL`) this is a complete no-op: the env
 * guard returns before importing anything, so a standalone build never captures,
 * never POSTs to an assumed endpoint, and keeps its real email/webhook
 * providers. Safe to ship in every app.
 *
 * ## Updating this file
 *
 * `mlcl create` generates this module, and it is safe to replace wholesale with
 * a newer generated copy. Projects scaffolded BEFORE `tee` mode existed carry a
 * version that ignores `MOLECULE_ACTIVITY_MODE` and intercepts every send
 * whenever `MOLECULE_ACTIVITY_URL` is set — including in production, where real
 * emails were captured instead of delivered. The platform detects that (it looks
 * for the string `MOLECULE_ACTIVITY_MODE` in this file) and turns activity
 * capture OFF for such a deploy rather than swallowing real sends, so an old
 * project still delivers — it just gets no production Activity panel entries. To
 * get production capture back, replace this file with the current version: ask
 * Synthase to "update api/src/bonds/_activity-capture.ts to the current version
 * with tee mode", or copy it from a freshly-scaffolded project.
 *
 * @module
 */

/**
 * Capturable bond categories, each paired with the capture package that records
 * its calls as activity events and the name of that package's factory for
 * WRAPPING a real provider (tee mode). Only categories the app has already
 * bonded are touched at all (see {@link setupActivityCapture}).
 */
const CAPTURE_PROVIDERS: ReadonlyArray<readonly [string, string, string]> = [
  ['email', '@molecule/api-emails-capture', 'createEmailCaptureProvider'],
  ['sms', '@molecule/api-sms-capture', 'createSMSCaptureProvider'],
  ['push-notifications', '@molecule/api-push-capture', 'createPushCaptureProvider'],
  ['webhook', '@molecule/api-webhook-capture', 'createWebhookCaptureProvider'],
  ['channel', '@molecule/api-channel-capture', 'createChannelCaptureProvider'],
]

/**
 * Wire the activity-capture producer when running inside the molecule.dev IDE.
 *
 * MUST be called LAST in `setupBonds()`, after the real providers are bonded, so
 * the capturable categories can be swapped (intercept) or wrapped (tee). A no-op
 * when `MOLECULE_ACTIVITY_URL` is unset (any standalone build).
 */
export async function setupActivityCapture(): Promise<void> {
  if (!process.env.MOLECULE_ACTIVITY_URL) {
    // Not running inside the molecule.dev IDE — never capture and never POST to
    // an assumed endpoint. The app's real providers stay bonded.
    return
  }

  // Explicit and platform-provided. Anything other than 'tee' — including unset,
  // which is what an older platform sends — means intercept, so the dev
  // semantics this module shipped with never change underneath a project.
  const tee = process.env.MOLECULE_ACTIVITY_MODE === 'tee'

  const [{ setSink }, { createHttpSink }] = await Promise.all([
    import('@molecule/api-activity'),
    import('@molecule/api-activity-http'),
  ])
  // createHttpSink reads MOLECULE_ACTIVITY_URL / MOLECULE_VAULT_TOKEN /
  // MOLECULE_APP_ID per request and no-ops if the URL is ever unset.
  setSink(createHttpSink())

  const { bond, get } = await import('@molecule/api-bond')
  for (const [category, providerPackage, factoryName] of CAPTURE_PROVIDERS) {
    // Only touch a category the app actually uses, so capture never introduces a
    // bond the app never wired itself.
    const realProvider = get(category)
    if (realProvider == null) {
      continue
    }
    // Defense in depth: the capture providers are declared as dependencies by the
    // scaffolder, so this import normally resolves. If one is ever absent, skip
    // capturing THAT category and keep booting — a missing optional dev-telemetry
    // provider must never crash the whole API (it once did, ERR_MODULE_NOT_FOUND).
    try {
      const captureModule = (await import(providerPackage)) as Record<string, unknown>

      if (tee) {
        const createCaptureProvider = captureModule[factoryName]
        if (typeof createCaptureProvider !== 'function') {
          // An older capture package with no tee factory. Keep the REAL provider:
          // in tee mode the side effect MUST still be delivered, and losing the
          // activity record is by far the safer half to lose.
          console.warn(
            '[activity-capture] ' +
              providerPackage +
              ' exposes no ' +
              factoryName +
              '(); delivering ' +
              category +
              ' for real without recording it',
          )
          continue
        }
        bond(category, (createCaptureProvider as (real: unknown) => unknown)(realProvider))
        continue
      }

      const { provider } = captureModule as { provider?: unknown }
      if (provider == null) {
        console.warn(
          '[activity-capture] ' +
            providerPackage +
            ' exports no provider; not capturing ' +
            category,
        )
        continue
      }
      bond(category, provider)
    } catch (error) {
      console.warn(
        '[activity-capture] provider ' +
          providerPackage +
          ' unavailable; not capturing ' +
          category,
        error,
      )
    }
  }
}
