import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface RecentUpload {
  id: string
  filename: string
  size_bytes: number
  rows?: number
  uploaded_at: string
  status: 'parsing' | 'ready' | 'failed' | 'uploaded' | 'pending' | 'uploading'
}

interface DatasetCreated {
  id: string
}

const FORMATS = ['CSV', 'JSON', 'JSONL', 'XLSX', 'Parquet'] as const
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB client-side parse cap

/** The design's capability grid under "What you can do with Clarion". */
const CAPABILITIES = [
  {
    id: 'ask',
    icon: 'forum',
    title: 'Ask questions in plain English',
    body: 'Query your dataset naturally. No SQL required.',
  },
  {
    id: 'charts',
    icon: 'bar_chart',
    title: 'Generate charts automatically',
    body: 'Instant visualizations based on data structures.',
  },
  {
    id: 'anomalies',
    icon: 'memory',
    title: 'Detect anomalies and trends',
    body: 'AI automatically flags outliers in your metrics.',
  },
  {
    id: 'share',
    icon: 'lock',
    title: 'Share securely with your team',
    body: 'Granular access controls for sensitive data.',
  },
] as const

/** Formatting-tips checklist (key → its en defaultValue). */
const TIPS: Record<string, string> = {
  'upload.tip.headers': 'Ensure the first row contains descriptive column headers.',
  'upload.tip.dates': 'Use consistent date formats (YYYY-MM-DD is preferred).',
  'upload.tip.emptyRows': 'Remove empty rows at the end of your file before uploading.',
}

/** Warehouse/file sources deep-linking into Settings → integrations. */
const IMPORT_SOURCES = [
  { key: 'postgres', icon: 'database', label: 'PostgreSQL' },
  { key: 'snowflake', icon: 'ac_unit', label: 'Snowflake' },
  { key: 'bigquery', icon: 'search', label: 'BigQuery' },
  { key: 's3', icon: 'folder_zip', label: 'S3 Bucket' },
  { key: 'sheets', icon: 'table_chart', label: 'Google Sheets' },
] as const

const STATUS_COLOR: Record<string, string> = {
  parsing: 'bg-warning/15 text-warning',
  uploading: 'bg-warning/15 text-warning',
  pending: 'bg-warning/15 text-warning',
  ready: 'bg-success/15 text-success',
  uploaded: 'bg-success/15 text-success',
  failed: 'bg-error/15 text-error',
}

function fmtBytes(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} GB`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} MB`
  return `${(n / 1_000).toFixed(0)} KB`
}

function fmtRelative(iso: string): string {
  const d = new Date(iso)
  const diffH = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

interface ParsedFile {
  filename: string
  format: 'csv' | 'json' | 'jsonl' | 'xlsx' | 'parquet'
  size_bytes: number
  columns: {
    name: string
    type: string
    nullable: boolean
    unique_count: number
    example: string
  }[]
  sample_rows: Record<string, string | number | boolean | null>[]
}

/**
 * Parse a small CSV in the browser. Supports comma/tab/semicolon delimiters,
 * quoted fields with embedded commas, and a header row. Returns at most
 * `limitRows` data rows (excluding the header).
 */
function parseCsv(text: string, limitRows = 200): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  // Sniff delimiter by checking the first line.
  const first = lines[0]
  const counts: Array<{ d: string; n: number }> = [
    { d: ',', n: (first.match(/,/g) ?? []).length },
    { d: '\t', n: (first.match(/\t/g) ?? []).length },
    { d: ';', n: (first.match(/;/g) ?? []).length },
  ]
  counts.sort((a, b) => b.n - a.n)
  const delim = counts[0].n > 0 ? counts[0].d : ','

  const splitRow = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"'
            i++
          } else inQuotes = false
        } else cur += ch
      } else {
        if (ch === '"') inQuotes = true
        else if (ch === delim) {
          out.push(cur)
          cur = ''
        } else cur += ch
      }
    }
    out.push(cur)
    return out
  }

  const headers = splitRow(lines[0]).map((h) => h.trim())
  const rows: string[][] = []
  for (let i = 1; i < lines.length && rows.length < limitRows; i++) {
    rows.push(splitRow(lines[i]))
  }
  return { headers, rows }
}

function inferType(samples: string[]): { type: string; nullable: boolean } {
  let allInt = true
  let allFloat = true
  let allBool = true
  let allDate = true
  let nullable = false
  for (const v of samples) {
    if (v === '' || v == null) {
      nullable = true
      continue
    }
    if (!/^-?\d+$/.test(v)) allInt = false
    if (!/^-?\d+(\.\d+)?$/.test(v)) allFloat = false
    if (!/^(true|false|0|1|yes|no)$/i.test(v)) allBool = false
    if (Number.isNaN(Date.parse(v))) allDate = false
  }
  if (samples.every((s) => s === '')) return { type: 'string', nullable: true }
  if (allInt) return { type: 'integer', nullable }
  if (allFloat) return { type: 'float', nullable }
  if (allBool) return { type: 'boolean', nullable }
  if (allDate) return { type: 'date', nullable }
  return { type: 'string', nullable }
}

async function parseFile(file: File): Promise<ParsedFile> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  const text = await file.text()

  if (ext === 'csv' || ext === 'tsv') {
    const { headers, rows } = parseCsv(text, 200)
    const columns = headers.map((h, i) => {
      const samples = rows.map((r) => r[i] ?? '').slice(0, 100)
      const { type, nullable } = inferType(samples)
      const unique = new Set(samples.filter((v) => v !== '')).size
      return {
        name: h || `column_${i + 1}`,
        type,
        nullable,
        unique_count: unique,
        example: samples.find((v) => v !== '') ?? '',
      }
    })
    const sample_rows = rows.slice(0, 50).map((r) => {
      const obj: Record<string, string | number | boolean | null> = {}
      headers.forEach((h, i) => {
        obj[h || `column_${i + 1}`] = r[i] ?? null
      })
      return obj
    })
    return {
      filename: file.name,
      format: 'csv',
      size_bytes: file.size,
      columns,
      sample_rows,
    }
  }

  if (ext === 'jsonl' || ext === 'ndjson') {
    const lines = text
      .split(/\r\n|\n|\r/)
      .filter((l) => l.length > 0)
      .slice(0, 200)
    const records = lines.map((l) => {
      try {
        return JSON.parse(l) as Record<string, unknown>
      } catch (_error) {
        // Malformed JSONL line — skip by returning an empty record
        return {}
      }
    })
    return shapeJsonRecords(file.name, file.size, 'jsonl', records)
  }

  if (ext === 'json') {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (_error) {
      // Invalid JSON — fall back to an empty array so the upload still proceeds
      parsed = []
    }
    const records = (Array.isArray(parsed) ? parsed : [parsed]).slice(0, 200) as Record<
      string,
      unknown
    >[]
    return shapeJsonRecords(file.name, file.size, 'json', records)
  }

  // Unsupported binary format (xlsx, parquet) — fall back to header-only stub
  return {
    filename: file.name,
    format: ext === 'xlsx' ? 'xlsx' : ext === 'parquet' ? 'parquet' : 'json',
    size_bytes: file.size,
    columns: [
      {
        name: 'binary_content',
        type: 'string',
        nullable: false,
        unique_count: 1,
        example: '(binary)',
      },
    ],
    sample_rows: [{ binary_content: `(${ext} contents not parsed in browser)` }],
  }
}

function shapeJsonRecords(
  filename: string,
  size: number,
  fmt: 'json' | 'jsonl',
  records: Record<string, unknown>[],
): ParsedFile {
  const headers = Array.from(new Set(records.flatMap((r) => Object.keys(r))))
  const columns = headers.map((h) => {
    const samples = records.map((r) => (r[h] == null ? '' : String(r[h]))).slice(0, 100)
    const { type, nullable } = inferType(samples)
    const unique = new Set(samples.filter((v) => v !== '')).size
    return {
      name: h,
      type,
      nullable,
      unique_count: unique,
      example: samples.find((v) => v !== '') ?? '',
    }
  })
  const sample_rows = records.slice(0, 50).map((r) => {
    const obj: Record<string, string | number | boolean | null> = {}
    for (const h of headers) {
      const v = r[h]
      obj[h] =
        v == null
          ? null
          : typeof v === 'object'
            ? JSON.stringify(v)
            : (v as string | number | boolean)
    }
    return obj
  })
  return { filename, format: fmt, size_bytes: size, columns, sample_rows }
}

export function Upload() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [recent, setRecent] = useState<RecentUpload[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshRecent = async () => {
    try {
      const res = await http.get('/api/uploads')
      setRecent(unwrapList<RecentUpload>(res))
    } catch (_error) {
      // Best-effort background refresh — failure is non-critical, list stays unchanged
    }
  }

  useEffect(() => {
    void refreshRecent()
    // Refresh handled by hook; ESLint can't see the closure intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  async function handleUpload() {
    if (!file) return
    setError(null)
    if (file.size > MAX_BYTES) {
      setError(
        t(
          'upload.tooLarge',
          { max: fmtBytes(MAX_BYTES) },
          { defaultValue: 'File is too large for browser parsing (limit {{max}}).' },
        ),
      )
      return
    }
    setUploading(true)
    try {
      const parsed = await parseFile(file)
      const res = await http.post('/api/datasets/from_upload', {
        filename: parsed.filename,
        format: parsed.format,
        size_bytes: parsed.size_bytes,
        columns: parsed.columns,
        sample_rows: parsed.sample_rows,
      })
      const created = unwrapSingle<DatasetCreated>(res)
      if (created?.id) {
        // Domain event: the upload funnel's success point. Fire-and-forget —
        // the analytics call must never gate the navigation below.
        void track({
          name: 'dataset.uploaded',
          properties: {
            id: created.id,
            format: parsed.format,
            columns: parsed.columns.length,
            rows: parsed.sample_rows.length,
            size_bytes: parsed.size_bytes,
          },
        })
        // Navigate straight into the new dataset's detail page so the user
        // immediately sees the schema + preview produced from their file.
        navigate(`/datasets/${created.id}`)
      } else {
        await refreshRecent()
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('upload.uploadError', {}, { defaultValue: 'Upload failed.' }),
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <div>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('common.upload', {}, { defaultValue: 'Upload' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'upload.subheading',
            {},
            {
              defaultValue:
                'Drop a CSV, JSON, JSONL, XLSX, or Parquet file. Browser-parsed up to 10 MB.',
            },
          )}
        </p>
      </div>

      <section
        className={cm.cn(
          cm.card(),
          cm.sp('p', 12),
          cm.textCenter,
          'border-2 border-dashed border-outline cursor-pointer',
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) setFile(f)
        }}
        data-mol-id="upload-dropzone"
      >
        <span
          className={'material-symbols-outlined text-5xl text-primary block'}
          aria-hidden="true"
        >
          upload_file
        </span>
        <p
          data-mol-id="upload-filename"
          className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 3))}
        >
          {file ? file.name : t('upload.dropPrompt', {}, { defaultValue: 'Drop your file here' })}
        </p>
        {!file ? (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'upload.browsePrompt',
              {},
              { defaultValue: 'or click to browse from your computer' },
            )}
          </p>
        ) : null}
        <div
          className={cm.cn(cm.flex({ gap: 'sm', justify: 'center' }), cm.sp('mt', 3), 'flex-wrap')}
        >
          {FORMATS.map((f) => (
            <span
              key={f}
              className={cm.cn(
                cm.sp('px', 2),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'bg-surface-container font-mono',
                'text-on-surface-variant',
              )}
            >
              {f}
            </span>
          ))}
        </div>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t('upload.maxSize', { size: fmtBytes(MAX_BYTES) }, { defaultValue: 'Max {{size}}' })}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.json,.jsonl,.ndjson,.parquet"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={cm.cn(cm.sp('mt', 4), 'block mx-auto')}
          data-mol-id="upload-file-input"
        />
      </section>

      {error ? (
        <p
          role="alert"
          data-mol-id="upload-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-md bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </p>
      ) : null}

      {file ? (
        <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
          <button
            type="button"
            onClick={() => {
              setFile(null)
              if (inputRef.current) inputRef.current.value = ''
              setError(null)
            }}
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
            onClick={handleUpload}
            disabled={uploading}
            data-mol-id="upload-submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {uploading
              ? t('upload.uploading', {}, { defaultValue: 'Uploading…' })
              : t('upload.uploadCta', {}, { defaultValue: 'Upload & analyze' })}
          </button>
        </div>
      ) : null}

      <section
        aria-labelledby="upload-capabilities-heading"
        className={cm.flex({ direction: 'col', gap: 4 })}
      >
        <div className={cm.flex({ align: 'center', gap: 2 })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'bg-primary/10 text-primary',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>insights</span>
          </span>
          <h2
            id="upload-capabilities-heading"
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-headline tracking-tight text-on-surface',
            )}
          >
            {t(
              'upload.capabilitiesHeading',
              { appName: APP_NAME },
              { defaultValue: 'What you can do with {{appName}}' },
            )}
          </h2>
        </div>
        <div className={cm.cn(cm.grid({ cols: 1, gap: 3 }), 'sm:grid-cols-2')}>
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.id}
              className={cm.cn(
                cm.flex({ align: 'start', gap: 3 }),
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(9),
                  cm.h(9),
                  cm.roundedFull,
                  'bg-secondary/10 text-secondary flex-shrink-0',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
                  {cap.icon}
                </span>
              </span>
              <div className={cm.flex({ direction: 'col', gap: 1 })}>
                <h3
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {t(`upload.capability.${cap.id}.title`, {}, { defaultValue: cap.title })}
                </h3>
                <p className={cm.cn(cm.textSize('xs'), 'leading-relaxed text-on-surface-variant')}>
                  {t(`upload.capability.${cap.id}.body`, {}, { defaultValue: cap.body })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="upload-tips-heading"
        className={cm.flex({ direction: 'col', gap: 3 })}
      >
        <div className={cm.flex({ align: 'center', gap: 2 })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              'bg-warning/10 text-warning',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>lightbulb</span>
          </span>
          <h2
            id="upload-tips-heading"
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-headline tracking-tight text-on-surface',
            )}
          >
            {t('upload.tipsHeading', {}, { defaultValue: 'Formatting Tips' })}
          </h2>
        </div>
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 2 }), 'list-none p-0')}>
          {Object.entries(TIPS).map(([tipKey, tipDefault]) => (
            <li key={tipKey} className={cm.flex({ align: 'start', gap: 2 })}>
              <span
                className={cm.cn(
                  'material-symbols-outlined',
                  cm.textSize('sm'),
                  'text-success flex-shrink-0',
                )}
                aria-hidden="true"
              >
                check_circle
              </span>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(tipKey, {}, { defaultValue: tipDefault })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="upload-sources-heading"
        className={cm.flex({ direction: 'col', gap: 3 })}
      >
        <h2
          id="upload-sources-heading"
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight text-on-surface',
          )}
        >
          {t('upload.sourcesHeading', {}, { defaultValue: 'Or import directly from a source' })}
        </h2>
        <div className={cm.flex({ wrap: 'wrap', gap: 2 })}>
          {IMPORT_SOURCES.map((src) => (
            <Link
              key={src.key}
              to="/settings#integrations"
              data-mol-id={`upload-source-${src.key}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-primary/40 hover:text-primary transition-colors',
              )}
            >
              <span
                className={cm.cn(
                  'material-symbols-outlined',
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
                aria-hidden="true"
              >
                {src.icon}
              </span>
              {src.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
          {t('upload.recentHeading', {}, { defaultValue: 'Recent uploads' })}
        </h2>
        {recent.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('upload.noRecent', {}, { defaultValue: 'No uploads yet.' })}
          </p>
        ) : (
          <ul data-mol-id="upload-recent-list" className={'space-y-2'}>
            {recent.map((r) => (
              <li
                key={r.id}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', justify: 'between' }),
                )}
              >
                <div className={'min-w-0'}>
                  <p className={cm.cn(cm.fontWeight('semibold'), 'font-mono truncate')}>
                    {r.filename}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {fmtBytes(r.size_bytes)}
                    {r.rows ? ` · ${r.rows.toLocaleString()} rows` : ''} ·{' '}
                    {fmtRelative(r.uploaded_at)}
                  </p>
                </div>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      cm.roundedFull,
                      STATUS_COLOR[r.status] ?? 'bg-surface-container text-on-surface-variant',
                    )}
                  >
                    {r.status}
                  </span>
                  {r.status === 'ready' || r.status === 'uploaded' ? (
                    <Link
                      to="/datasets"
                      className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
                    >
                      {t('upload.viewCta', {}, { defaultValue: 'Datasets →' })}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
