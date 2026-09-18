import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { formatMoney, getCurrency } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SUPPORTED_FORMATS = ['CSV'] as const

interface AccountOption {
  id: string
  name: string
}

interface PreviewRow {
  date: string
  payee: string
  memo: string | null
  category_name: string | null
  amount_cents: number
  type: 'inflow' | 'outflow'
}

interface PreviewResponse {
  detected: number
  sample: PreviewRow[]
  rows: PreviewRow[]
}

interface CommitResponse {
  inserted: number
}

function fmt(cents: number): string {
  return formatMoney(cents, getCurrency(), { grouping: false })
}

export function ImportTransactions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [accountId, setAccountId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState<string>('')
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void http
      .get('/api/accounts')
      .then((r) => {
        if (cancelled) return
        const list = unwrapList<AccountOption>(r)
        setAccounts(list)
        if (list[0]) setAccountId(list[0].id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  function reset() {
    setFile(null)
    setCsvText('')
    setPreview(null)
    setError(null)
    setSuccess(null)
  }

  async function handleFileChange(f: File | null) {
    setFile(f)
    setPreview(null)
    setError(null)
    setSuccess(null)
    if (!f) {
      setCsvText('')
      return
    }
    try {
      const text = await f.text()
      setCsvText(text)
    } catch (_error) {
      // file read failure shown to user via setError below — no additional logging needed
      setError(t('import.error.read', {}, { defaultValue: 'Could not read the selected file.' }))
    }
  }

  async function runPreview() {
    if (!csvText) {
      setError(t('import.error.noFile', {}, { defaultValue: 'Pick a CSV file first.' }))
      return
    }
    if (!accountId) {
      setError(t('import.error.account', {}, { defaultValue: 'Pick a destination account first.' }))
      return
    }
    setPreviewing(true)
    setError(null)
    try {
      const res = await http.post('/api/import/preview', { csv: csvText, account_id: accountId })
      const body = unwrapSingle<PreviewResponse>(res)
      if (!body) {
        setError(
          t(
            'import.error.preview',
            {},
            {
              defaultValue:
                'Could not parse the file. Make sure it has a header row with date and amount columns.',
            },
          ),
        )
        return
      }
      setPreview(body)
      if (body.detected === 0) {
        setError(
          t(
            'import.error.empty',
            {},
            {
              defaultValue:
                'No transaction rows detected. Make sure the CSV has date + amount columns.',
            },
          ),
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t('import.error.preview', {}, { defaultValue: 'Preview failed.' }))
    } finally {
      setPreviewing(false)
    }
  }

  async function runCommit() {
    if (!preview || preview.rows.length === 0) return
    setCommitting(true)
    setError(null)
    try {
      const res = await http.post('/api/import/commit', {
        account_id: accountId,
        rows: preview.rows,
      })
      const body = unwrapSingle<CommitResponse>(res)
      const n = body?.inserted ?? 0
      setSuccess(
        t('import.success', { count: n }, { defaultValue: 'Imported {{count}} transactions.' }),
      )
      setPreview(null)
      setFile(null)
      setCsvText('')
      // Forward to the destination account so the user can see their new rows.
      setTimeout(() => navigate(`/accounts/${accountId}`), 800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t('import.error.commit', {}, { defaultValue: 'Import failed.' }))
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/transactions"
        className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
      >
        ← {t('nav.transactions', {}, { defaultValue: 'Transactions' })}
      </Link>
      <div>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.sp('mt', 4),
            cm.sp('mb', 2),
          )}
        >
          {t('import.heading', {}, { defaultValue: 'Import transactions' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'import.subheading',
            { formats: SUPPORTED_FORMATS.join(' / '), appName: APP_NAME },
            {
              defaultValue:
                'Drag a {{formats}} export from your bank. {{appName}} dedupes and applies category rules.',
            },
          )}
        </p>
      </div>

      {success ? (
        <p
          role="status"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-success/10 text-success border border-success/20',
          )}
        >
          {success}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-error/10 text-error border border-error/20',
          )}
        >
          {error}
        </p>
      ) : null}

      <label className="block">
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('import.account', {}, { defaultValue: 'Destination account' })}
        </span>
        <select
          name="account_id"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md',
          )}
        >
          <option value="">
            {accounts.length === 0
              ? t('import.account.empty', {}, { defaultValue: 'No accounts yet — add one first.' })
              : t('import.account.placeholder', {}, { defaultValue: 'Select account' })}
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <section
        className={cm.cn(
          cm.card(),
          cm.sp('p', 12),
          cm.textCenter,
          'border-2 border-dashed border-outline',
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) void handleFileChange(f)
        }}
      >
        <span className="material-symbols-outlined text-5xl text-primary block" aria-hidden="true">
          upload_file
        </span>
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 3))}>
          {file
            ? file.name
            : t('import.dropPrompt', {}, { defaultValue: 'Drop a file here, or click to browse' })}
        </p>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'import.formats',
            { formats: SUPPORTED_FORMATS.join(', ') },
            { defaultValue: 'Supports {{formats}}' },
          )}
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            void handleFileChange(e.target.files?.[0] ?? null)
          }}
          className={cm.cn(cm.sp('mt', 4), 'block mx-auto')}
        />
      </section>

      {file ? (
        <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
          <button
            type="button"
            onClick={reset}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('medium'),
              'border border-outline rounded-md hover:bg-surface-container',
            )}
          >
            {t('common.remove', {}, { defaultValue: 'Remove' })}
          </button>
          <button
            type="button"
            onClick={() => {
              void runPreview()
            }}
            disabled={previewing || !accountId}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {previewing
              ? t('import.previewing', {}, { defaultValue: 'Preparing preview…' })
              : t('import.previewCta', {}, { defaultValue: 'Preview import' })}
          </button>
        </div>
      ) : null}

      {preview && preview.detected > 0 ? (
        <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t(
                'import.previewHeading',
                { count: preview.detected },
                { defaultValue: 'Preview ({{count}} rows)' },
              )}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table
              className={cm.cn('w-full', cm.textSize('sm'))}
              data-testid="import-preview-table"
            >
              <thead className={cm.cn('text-on-surface-variant uppercase tracking-wide text-xs')}>
                <tr>
                  <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                    {t('form.date', {}, { defaultValue: 'Date' })}
                  </th>
                  <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                    {t('import.col.payee', {}, { defaultValue: 'Payee' })}
                  </th>
                  <th className={cm.cn(cm.sp('py', 2), 'text-left')}>
                    {t('form.category', {}, { defaultValue: 'Category' })}
                  </th>
                  <th className={cm.cn(cm.sp('py', 2), 'text-right')}>
                    {t('form.amount', {}, { defaultValue: 'Amount' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {preview.sample.map((r, i) => (
                  <tr key={`${r.date}-${i}`}>
                    <td
                      className={cm.cn(cm.sp('py', 2), 'whitespace-nowrap text-on-surface-variant')}
                    >
                      {r.date}
                    </td>
                    <td className={cm.cn(cm.sp('py', 2), cm.fontWeight('medium'))}>{r.payee}</td>
                    <td className={cm.cn(cm.sp('py', 2), 'text-on-surface-variant')}>
                      {r.category_name ?? '—'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('py', 2),
                        'text-right tabular-nums',
                        cm.fontWeight('semibold'),
                        r.amount_cents < 0 ? 'text-error' : 'text-success',
                      )}
                    >
                      {fmt(r.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > preview.sample.length ? (
              <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {t(
                  'import.moreRows',
                  { count: preview.rows.length - preview.sample.length },
                  { defaultValue: '…and {{count}} more rows.' },
                )}
              </p>
            ) : null}
          </div>
          <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                'border border-outline rounded-md hover:bg-surface-container',
              )}
            >
              {t('common.back', {}, { defaultValue: 'Back' })}
            </button>
            <button
              type="button"
              onClick={() => {
                void runCommit()
              }}
              disabled={committing}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md disabled:opacity-50',
              )}
              data-testid="import-commit"
            >
              {committing
                ? t('import.committing', {}, { defaultValue: 'Importing…' })
                : t(
                    'import.commitCta',
                    { count: preview.rows.length },
                    { defaultValue: 'Import {{count}} rows' },
                  )}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
