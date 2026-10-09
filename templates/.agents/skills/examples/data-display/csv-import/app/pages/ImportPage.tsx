import { type ChangeEvent, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type ImportError = { row: number; errors: string[] }

/** Response shape of `POST /api/import/preview`. */
type PreviewResult = {
  totalRows: number
  previewRows: Record<string, string>[]
  valid: number
  invalid: ImportError[]
}

/** Response shape of `POST /api/import/commit`. */
type CommitResult = {
  imported: number
  updated: number
  skipped: number
  invalid: ImportError[]
}

type Status = 'idle' | 'previewing' | 'ready' | 'committing' | 'done' | 'error'

/**
 * CSV import flow: pick a file → preview the first rows (invalid ones flagged
 * inline) → Cancel or Confirm → busy indicator during the commit → summary of
 * how many records were imported / updated / skipped. Posts the raw CSV bytes
 * to the slice's `/api/import/preview` and `/api/import/commit` endpoints.
 */
export function ImportPage() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [result, setResult] = useState<CommitResult | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  function reset(): void {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setStatus('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setPreview(null)
    setResult(null)
    setError(null)
    if (!selected) {
      setStatus('idle')
      return
    }
    setStatus('previewing')
    try {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: selected,
        credentials: 'include',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(
          body.error ??
            t('import.error.preview', undefined, { defaultValue: 'Could not read the file' }),
        )
      }
      const data = (await res.json()) as PreviewResult
      setPreview(data)
      setStatus('ready')
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('import.error.preview', undefined, { defaultValue: 'Could not read the file' }),
      )
      setStatus('error')
    }
  }

  async function handleConfirm(): Promise<void> {
    if (!file) return
    setStatus('committing')
    setError(null)
    try {
      const res = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: file,
        credentials: 'include',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(
          body.error ?? t('import.error.commit', undefined, { defaultValue: 'Import failed' }),
        )
      }
      const data = (await res.json()) as CommitResult
      setResult(data)
      setStatus('done')
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('import.error.commit', undefined, { defaultValue: 'Import failed' }),
      )
      setStatus('error')
    }
  }

  // Map source-line number → its validation errors so preview rows can be
  // flagged. The API numbers rows as (index + 2): +1 for the header, +1 for
  // 1-indexing, so previewRows[i] corresponds to line number i + 2.
  const invalidByRow = new Map<number, string[]>()
  if (preview) {
    for (const item of preview.invalid) invalidByRow.set(item.row, item.errors)
  }
  const columns =
    preview && preview.previewRows.length > 0 ? Object.keys(preview.previewRows[0]) : []

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('p', 6))}
      style={{ maxWidth: '48rem' }}
    >
      <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('import.title', undefined, { defaultValue: 'Import from CSV' })}
      </h1>
      <p className={cm.textMuted}>
        {t('import.help', undefined, {
          defaultValue: 'Upload a CSV file to preview rows before importing.',
        })}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => void handleFile(e)}
        disabled={status === 'previewing' || status === 'committing'}
        data-mol-id="import-file-input"
        className={cm.input({})}
      />

      {status === 'previewing' ? (
        <p className={cm.textMuted}>
          {t('import.previewing', undefined, { defaultValue: 'Reading file…' })}
        </p>
      ) : null}

      {error ? <p className={cm.textError}>{error}</p> : null}

      {preview && status !== 'done' ? (
        <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
          <p className={cm.textSize('sm')}>
            {t(
              'import.summary',
              {
                total: preview.totalRows,
                valid: preview.valid,
                invalid: preview.invalid.length,
                shown: preview.previewRows.length,
              },
              {
                defaultValue: `${preview.totalRows} rows found — ${preview.valid} valid, ${preview.invalid.length} with errors (showing first ${preview.previewRows.length}).`,
              },
            )}
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className={cm.table}>
              <thead className={cm.tableHeader}>
                <tr className={cm.tableRow}>
                  <th className={cm.tableHead}>
                    {t('import.col.status', undefined, { defaultValue: 'Status' })}
                  </th>
                  {columns.map((col) => (
                    <th key={col} className={cm.tableHead}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={cm.tableBody}>
                {preview.previewRows.map((row, i) => {
                  const rowNumber = i + 2
                  const errors = invalidByRow.get(rowNumber)
                  const invalid = errors !== undefined
                  return (
                    <tr key={rowNumber} className={cm.tableRow}>
                      <td className={cm.tableCell}>
                        {invalid ? (
                          <span className={cm.textError} title={errors.join('\n')}>
                            {t(
                              'import.rowInvalid',
                              { errors: errors.join(', ') },
                              {
                                defaultValue: `⚠ ${errors.join(', ')}`,
                              },
                            )}
                          </span>
                        ) : (
                          <span className={cm.textSuccess} aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </td>
                      {columns.map((col) => (
                        <td key={col} className={cm.tableCell}>
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="button"
              onClick={reset}
              disabled={status === 'committing'}
              data-mol-id="import-cancel"
              className={cm.button({ variant: 'outline' })}
            >
              {t('import.cancel', undefined, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={status === 'committing'}
              data-mol-id="import-confirm"
              className={cm.button({ variant: 'solid' })}
            >
              {status === 'committing'
                ? t('import.committing', undefined, { defaultValue: 'Importing…' })
                : t('import.confirm', undefined, { defaultValue: 'Confirm import' })}
            </button>
          </div>
        </div>
      ) : null}

      {status === 'committing' ? (
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span className={cm.spinner()} aria-hidden="true" />
          <span className={cm.textMuted}>
            {t('import.inProgress', undefined, { defaultValue: 'Importing rows…' })}
          </span>
        </div>
      ) : null}

      {status === 'done' && result ? (
        <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
          <p className={cm.textSuccess}>
            {t(
              'import.done',
              {
                imported: result.imported,
                updated: result.updated,
                skipped: result.skipped,
              },
              {
                defaultValue: `Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped}.`,
              },
            )}
          </p>
          <button
            type="button"
            onClick={reset}
            data-mol-id="import-again"
            className={cm.button({ variant: 'outline' })}
          >
            {t('import.again', undefined, { defaultValue: 'Import another file' })}
          </button>
        </div>
      ) : null}
    </div>
  )
}
