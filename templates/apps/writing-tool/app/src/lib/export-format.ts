/**
 * The writer's default export format (Settings → Export).
 *
 * Persisted to localStorage by the Settings page, but the Editor's Export CTA
 * hardcoded `format: 'md'` — so choosing a different default had no effect. This
 * is the single source of truth for the key, the producible format set, and a
 * pure reader the Editor uses.
 *
 * The set is exactly what the backend `POST /exports` handler can render
 * (`md` / `txt` / `html`); the Settings picker offers the same set so every
 * choice produces a real artifact (it previously also offered `pdf`/`docx`,
 * which the backend rejects — a phantom option).
 */

/** localStorage key for the writer's default export format. */
export const EXPORT_FORMAT_KEY = 'versal.defaultExportFormat'

/** Formats the backend export renderer can actually produce. */
export const EXPORT_FORMATS = ['md', 'txt', 'html'] as const

export type ExportFormat = (typeof EXPORT_FORMATS)[number]

/** Fallback export format when unset or invalid. */
export const DEFAULT_EXPORT_FORMAT: ExportFormat = 'md'

function isExportFormat(value: string | null): value is ExportFormat {
  return value != null && (EXPORT_FORMATS as readonly string[]).includes(value)
}

/**
 * Read the stored default export format, falling back to markdown when unset,
 * invalid, or unavailable (private mode / SSR). Always returns a value the
 * backend `POST /exports` handler accepts.
 */
export function readDefaultExportFormat(
  storage: Pick<Storage, 'getItem'> | undefined = typeof globalThis.localStorage === 'undefined'
    ? undefined
    : globalThis.localStorage,
): ExportFormat {
  if (!storage) return DEFAULT_EXPORT_FORMAT
  try {
    const stored = storage.getItem(EXPORT_FORMAT_KEY)
    return isExportFormat(stored) ? stored : DEFAULT_EXPORT_FORMAT
  } catch (_error) {
    // localStorage may throw (private mode) — fall back to the default format.
    return DEFAULT_EXPORT_FORMAT
  }
}
