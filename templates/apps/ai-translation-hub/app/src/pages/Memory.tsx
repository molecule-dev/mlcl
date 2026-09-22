import { type FormEvent, useEffect, useRef, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LanguagePairBadge } from '../components/LanguagePairBadge.js'
import { PageHeading } from '../components/PageHeading.js'
import { unwrapList } from '../lib/unwrap.js'

interface MemoryEntry {
  id: string
  source_lang: string
  target_lang: string
  source: string
  target: string
  context?: string
  match_score: number
  used_count: number
  last_used: string
}

interface ApiMemoryRow {
  id?: unknown
  source_lang?: unknown
  target_lang?: unknown
  source_text?: unknown
  target_text?: unknown
  notes?: unknown
  used_count?: unknown
  last_used_at?: unknown
}

const SCORE_TONE = (score: number): string => {
  if (score >= 95) return 'bg-success-light text-success'
  if (score >= 80) return 'bg-warning-light text-warning'
  return 'bg-tertiary-container/15 text-tertiary'
}

function adapt(row: ApiMemoryRow, idx: number): MemoryEntry {
  const used = typeof row.used_count === 'number' ? row.used_count : 0
  const score = used >= 50 ? 100 : used >= 20 ? 88 : used >= 5 ? 76 : 64
  const lastUsed =
    row.last_used_at instanceof Date
      ? row.last_used_at.toISOString()
      : typeof row.last_used_at === 'string'
        ? row.last_used_at
        : ''
  return {
    id: String(row.id ?? `m_${idx}`),
    source_lang: String(row.source_lang ?? 'EN').toLowerCase(),
    target_lang: String(row.target_lang ?? 'ES').toLowerCase(),
    source: String(row.source_text ?? ''),
    target: String(row.target_text ?? ''),
    context: typeof row.notes === 'string' && row.notes ? row.notes : undefined,
    match_score: score,
    used_count: used,
    last_used: lastUsed,
  }
}

export function Memory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [entries, setEntries] = useState<ReadonlyArray<MemoryEntry>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [draftSrc, setDraftSrc] = useState('')
  const [draftTgt, setDraftTgt] = useState('')
  const [draftSrcLang, setDraftSrcLang] = useState('EN')
  const [draftTgtLang, setDraftTgtLang] = useState('ES')
  const [creating, setCreating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/memory')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<ApiMemoryRow>(res)
        setEntries(list.map((m, i) => adapt(m, i)))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('memory.loadError', {}, { defaultValue: 'Failed to load memory.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // Parse a TMX file (or naïve fallback for plain TSV) and POST each
  // segment to /api/memory.
  const importTmxText = async (text: string) => {
    type Pair = { source_lang: string; target_lang: string; source: string; target: string }
    const pairs: Pair[] = []
    if (text.includes('<tmx')) {
      const tuRe = /<tu\b[\s\S]*?<\/tu>/g
      const tuvRe = /<tuv\b([^>]*)>([\s\S]*?)<\/tuv>/g
      const langRe = /xml:lang\s*=\s*"([^"]+)"|lang\s*=\s*"([^"]+)"/i
      const segRe = /<seg>([\s\S]*?)<\/seg>/i
      const tus = text.match(tuRe) ?? []
      for (const tu of tus) {
        const tuvs: { lang: string; seg: string }[] = []
        let m: RegExpExecArray | null
        const cursor = tuvRe
        cursor.lastIndex = 0
        while ((m = cursor.exec(tu)) !== null) {
          const attrs = m[1] ?? ''
          const inner = m[2] ?? ''
          const langMatch = attrs.match(langRe)
          const lang = langMatch ? (langMatch[1] ?? langMatch[2] ?? '').toUpperCase() : ''
          const segMatch = inner.match(segRe)
          const seg = segMatch ? segMatch[1].trim() : ''
          if (lang && seg) tuvs.push({ lang: lang.split('-')[0], seg })
        }
        if (tuvs.length >= 2) {
          pairs.push({
            source_lang: tuvs[0].lang,
            target_lang: tuvs[1].lang,
            source: tuvs[0].seg,
            target: tuvs[1].seg,
          })
        }
      }
    } else {
      for (const line of text.split(/\r?\n/)) {
        const cols = line.split('\t')
        if (cols.length >= 2 && cols[0].trim() && cols[1].trim()) {
          pairs.push({
            source_lang: 'EN',
            target_lang: 'ES',
            source: cols[0].trim(),
            target: cols[1].trim(),
          })
        }
      }
    }
    if (pairs.length === 0) {
      throw new Error(t('memory.importEmpty', {}, { defaultValue: 'No translation units found.' }))
    }
    let imported = 0
    for (const p of pairs) {
      try {
        await http.post('/memory', {
          source_lang: p.source_lang,
          target_lang: p.target_lang,
          source_text: p.source,
          target_text: p.target,
        })
        imported += 1
      } catch (_error) {
        // Continue importing the rest, surface the count at the end.
      }
    }
    return imported
  }

  const handleImport = () => {
    if (importing) return
    fileInputRef.current?.click()
  }

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    setImportStatus(
      t('memory.importStarting', { name: file.name }, { defaultValue: 'Importing {{name}}…' }),
    )
    try {
      const text = await file.text()
      const imported = await importTmxText(text)
      // Refresh list.
      const res = await http.get('/memory')
      const list = unwrapList<ApiMemoryRow>(res)
      setEntries(list.map((m, i) => adapt(m, i)))
      // Domain event: a TMX/TSV import committed N memory entries.
      void track({ name: 'memory.imported', properties: { count: imported } })
      setImportStatus(
        t(
          'memory.importDone',
          { count: imported },
          { defaultValue: 'Imported {{count}} entries.' },
        ),
      )
    } catch (err) {
      setImportStatus(
        err instanceof Error
          ? err.message
          : t('memory.importFailed', {}, { defaultValue: 'TMX import failed.' }),
      )
    } finally {
      setImporting(false)
    }
  }

  const handleSubmitAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!draftSrc.trim() || !draftTgt.trim() || creating) return
    setCreating(true)
    try {
      const res = await http.post('/memory', {
        source_text: draftSrc,
        target_text: draftTgt,
        source_lang: draftSrcLang.toUpperCase(),
        target_lang: draftTgtLang.toUpperCase(),
      })
      const body = res as unknown as { data?: ApiMemoryRow } & ApiMemoryRow
      const row = (body.data ?? body) as ApiMemoryRow
      setEntries((prev) => [adapt(row, prev.length), ...prev])
      // Domain event: a translation-memory entry was committed (success point).
      void track({
        name: 'memory.added',
        properties: {
          entry_id: row?.id != null ? String(row.id) : null,
          source_lang: draftSrcLang.toUpperCase(),
          target_lang: draftTgtLang.toUpperCase(),
        },
      })
      setDraftSrc('')
      setDraftTgt('')
      setShowAdd(false)
      setImportStatus(t('memory.addDone', {}, { defaultValue: 'Memory entry added.' }))
    } catch (_error) {
      // Memory entry creation failed — surface the error message to the user.
      setImportStatus(t('memory.addFailed', {}, { defaultValue: 'Failed to add memory entry.' }))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('memory.eyebrow', {}, { defaultValue: 'Translation memory' })}
        title={t('memory.title', {}, { defaultValue: 'Memory bank' })}
        subtitle={t(
          'memory.subtitle',
          {},
          {
            defaultValue:
              'Re-use past translations across every project. Higher match score → less re-work.',
          },
        )}
        actions={
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tmx,.xml,.tsv,.txt"
              onChange={handleFileChosen}
              data-mol-id="memory-import-file"
              className="hidden"
            />
            <button
              data-mol-id="memory-import"
              onClick={handleImport}
              type="button"
              disabled={importing}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full inline-flex items-center gap-2 text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 shadow-sm shadow-primary/30 disabled:opacity-60',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                upload_file
              </span>
              {importing
                ? t('memory.importing', {}, { defaultValue: 'Importing…' })
                : t('memory.import', {}, { defaultValue: 'Import TMX' })}
            </button>
            <button
              data-mol-id="memory-add-toggle"
              onClick={() => setShowAdd((s) => !s)}
              type="button"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full inline-flex items-center gap-2 border border-outline-variant/40 text-on-surface hover:bg-surface-container-low',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                add
              </span>
              {t('memory.addEntry', {}, { defaultValue: 'Add entry' })}
            </button>
          </div>
        }
      />

      {showAdd && (
        <form
          onSubmit={handleSubmitAdd}
          data-mol-id="memory-add-form"
          className={cm.cn(
            cm.sp('p', 5),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'bg-surface-container-lowest rounded-xl border border-surface-container/50 shadow-sm',
          )}
        >
          <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 md:grid-cols-2')}>
            <label
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('memory.field.source', {}, { defaultValue: 'Source text' })}
              <textarea
                data-mol-id="memory-add-source"
                value={draftSrc}
                onChange={(e) => setDraftSrc(e.target.value)}
                required
                rows={2}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none font-serif-content',
                )}
              />
            </label>
            <label
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('memory.field.target', {}, { defaultValue: 'Target text' })}
              <textarea
                data-mol-id="memory-add-target"
                value={draftTgt}
                onChange={(e) => setDraftTgt(e.target.value)}
                required
                rows={2}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none font-serif-content',
                )}
              />
            </label>
            <label
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('memory.field.sourceLang', {}, { defaultValue: 'Source language' })}
              <input
                data-mol-id="memory-add-source-lang"
                value={draftSrcLang}
                onChange={(e) => setDraftSrcLang(e.target.value)}
                maxLength={10}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none font-mono uppercase',
                )}
              />
            </label>
            <label
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('memory.field.targetLang', {}, { defaultValue: 'Target language' })}
              <input
                data-mol-id="memory-add-target-lang"
                value={draftTgtLang}
                onChange={(e) => setDraftTgtLang(e.target.value)}
                maxLength={10}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none font-mono uppercase',
                )}
              />
            </label>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="submit"
              data-mol-id="memory-add-submit"
              disabled={creating || !draftSrc.trim() || !draftTgt.trim()}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full text-on-primary bg-primary hover:opacity-90 disabled:opacity-60',
              )}
            >
              {creating
                ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                : t('memory.submit', {}, { defaultValue: 'Save entry' })}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      )}

      {importStatus && (
        <div
          role="status"
          className={cm.cn(
            cm.sp('p', 3),
            'rounded-xl bg-primary-fixed/40 text-on-primary-fixed text-sm',
          )}
        >
          {importStatus}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      )}

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('memory.loading', {}, { defaultValue: 'Loading memory…' })}
        </p>
      )}

      {!loading && entries.length === 0 && !error && (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.textCenter,
            cm.sp('py', 12),
            'text-on-surface-variant',
          )}
        >
          {t(
            'memory.empty',
            {},
            {
              defaultValue:
                'No memory entries yet — translate a few segments to start building your TM.',
            },
          )}
        </p>
      )}

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        {entries.map((m) => (
          <article
            key={m.id}
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface-container-lowest rounded-xl border border-surface-container/50 shadow-sm hover:shadow-md ',
            )}
          >
            <header
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
                cm.sp('mb', 4),
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono',
                    SCORE_TONE(m.match_score),
                  )}
                >
                  {m.match_score}%
                </span>
                <LanguagePairBadge source={m.source_lang} target={m.target_lang} size="sm" />
                {m.context && (
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-mono uppercase tracking-widest font-bold text-on-surface-variant',
                    )}
                  >
                    {t(
                      'memory.context',
                      { context: m.context },
                      { defaultValue: 'Context: {{context}}' },
                    )}
                  </span>
                )}
              </div>
              <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                {t(
                  'memory.used',
                  { count: m.used_count, when: m.last_used },
                  { defaultValue: 'Used {{count}}× · last {{when}}' },
                )}
              </span>
            </header>
            <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'bg-source-pane rounded-lg font-serif-content text-sm border-l-4 border-l-secondary',
                )}
              >
                {m.source}
              </div>
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'bg-target-pane rounded-lg font-serif-content text-sm border-l-4 border-l-primary',
                )}
              >
                {m.target}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default Memory
export { Memory as MemoryPage }
