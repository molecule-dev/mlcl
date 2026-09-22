import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LanguagePairBadge } from '../components/LanguagePairBadge.js'
import { PageHeading } from '../components/PageHeading.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface ParsedSegment {
  source_text: string
}

/**
 * Best-effort parse of an uploaded file into source segments. We keep this
 * local-only (no S3 round-trip) because the bytes are pure source text and
 * the server's segment store already persists them via POST /api/segments.
 *
 * Supported inputs:
 *  - `.json` — array of strings, OR object with `segments`/`strings`
 *    array, OR i18next-style key/value object whose values are strings
 *  - `.csv` / `.tsv` — first column per row is the source segment
 *  - `.txt` — newline-delimited segments
 */
async function parseUploadedSegments(file: File): Promise<ParsedSegment[]> {
  const text = await file.text()
  const name = file.name.toLowerCase()
  if (name.endsWith('.json')) {
    try {
      const parsed: unknown = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
          .map((sourceText) => ({ source_text: sourceText }))
      }
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>
        const candidates = ['segments', 'strings', 'items', 'sources']
        for (const key of candidates) {
          const v = obj[key]
          if (Array.isArray(v)) {
            return v
              .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
              .map((sourceText) => ({ source_text: sourceText }))
          }
        }
        return Object.values(obj)
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
          .map((sourceText) => ({ source_text: sourceText }))
      }
    } catch (_error) {
      // fall through to plain-text handling
    }
  }
  if (name.endsWith('.csv') || name.endsWith('.tsv')) {
    const sep = name.endsWith('.tsv') ? '\t' : ','
    return text
      .split(/\r?\n/)
      .map((line) => line.split(sep)[0]?.trim() ?? '')
      .filter((s) => s.length > 0)
      .map((sourceText) => ({ source_text: sourceText }))
  }
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((sourceText) => ({ source_text: sourceText }))
}

const STEPS: ReadonlyArray<{ key: 'upload' | 'languages' | 'workflow'; defaultLabel: string }> = [
  { key: 'upload', defaultLabel: 'Upload sources' },
  { key: 'languages', defaultLabel: 'Choose languages' },
  { key: 'workflow', defaultLabel: 'Workflow & deadline' },
]

const ASSIST_MODES = [
  { key: 'mt_first', defaultLabel: 'MT first, human review', icon: 'auto_awesome' },
  { key: 'human_first', defaultLabel: 'Human translates, AI suggests', icon: 'edit_note' },
  { key: 'qa_only', defaultLabel: 'AI quality assurance only', icon: 'verified' },
]

const TARGET_SUGGESTIONS = ['it', 'ko', 'zh-CN', 'ar', 'nl', 'tr', 'pl', 'sv'] as const

export function NewProject() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [step, setStep] = useState<(typeof STEPS)[number]['key']>('upload')
  const [assist, setAssist] = useState<string>('mt_first')
  const [name, setName] = useState<string>('')
  const [deadline, setDeadline] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [targets, setTargets] = useState<ReadonlyArray<string>>(['es', 'fr', 'de'])
  const [showAddTarget, setShowAddTarget] = useState(false)
  const [uploadedSegments, setUploadedSegments] = useState<ReadonlyArray<ParsedSegment>>([])
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const handleAddTarget = (lang: string) => {
    if (!targets.includes(lang)) setTargets((prev) => [...prev, lang])
    setShowAddTarget(false)
  }

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return
    setUploadError(null)
    try {
      const segments = await parseUploadedSegments(file)
      if (segments.length === 0) {
        setUploadError(
          t(
            'newProject.uploadEmptyError',
            {},
            { defaultValue: 'No translatable text found in this file.' },
          ),
        )
        return
      }
      setUploadedSegments(segments)
      setUploadedFileName(file.name)
      if (!name.trim()) {
        const stem = file.name.replace(/\.[^.]+$/, '')
        if (stem) setName(stem)
      }
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : t('newProject.uploadParseError', {}, { defaultValue: 'Could not read this file.' }),
      )
    }
  }

  const clearUpload = () => {
    setUploadedSegments([])
    setUploadedFileName(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCreate = async () => {
    setCreating(true)
    setCreateError(null)
    try {
      const projectName =
        name.trim() || t('newProject.defaultName', {}, { defaultValue: 'Untitled project' })
      const res = await http.post('/projects', {
        name: projectName,
        target_langs: targets.map((l) => l.toUpperCase()),
        source_lang: 'EN',
        status: 'draft',
        due_date: deadline ? new Date(deadline).toISOString() : null,
      })
      const created = unwrapSingle<{ id: string }>(res) ?? (res as { data: { id: string } }).data
      const id = (created as { id?: string })?.id
      if (id && uploadedSegments.length > 0) {
        // Seed the project with the parsed source segments. We POST sequentially
        // so a single failure surfaces a precise error to the user; the segment
        // store is small and creation is rare so throughput isn't a concern.
        for (let i = 0; i < uploadedSegments.length; i += 1) {
          await http.post('/segments', {
            project_id: id,
            source_text: uploadedSegments[i].source_text,
            source_lang: 'EN',
            target_lang: targets[0]?.toUpperCase() || 'ES',
            position: i,
          })
        }
      }
      if (id) {
        // Domain event: a translation project was committed (conversion point).
        void track({
          name: 'project.created',
          properties: {
            project_id: id,
            target_langs: targets.map((l) => l.toUpperCase()),
            segment_count: uploadedSegments.length,
          },
        })
        navigate(`/projects/${id}`)
      } else {
        navigate('/projects')
      }
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t('newProject.createError', {}, { defaultValue: 'Failed to create project.' }),
      )
      setCreating(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('5xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('nav.newProject', {}, { defaultValue: 'New project' })}
        title={t('newProject.title', {}, { defaultValue: 'Start a translation project' })}
        subtitle={t(
          'newProject.subtitle',
          {},
          {
            defaultValue:
              'Upload your source files, pick target languages, and choose how AI assists your team.',
          },
        )}
      />

      <ol
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
          'p-4 bg-surface-container-lowest rounded-xl border border-surface-container/50',
        )}
      >
        {STEPS.map((s, i) => {
          const isActive = s.key === step
          const isDone = STEPS.findIndex((x) => x.key === step) > i
          return (
            <li key={s.key} className={cm.flex({ align: 'center', gap: 'sm' })}>
              <button
                type="button"
                onClick={() => setStep(s.key)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-full ',
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm shadow-primary/30'
                    : isDone
                      ? 'bg-success-light text-success'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(6),
                    cm.h(6),
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'rounded-full',
                    isActive
                      ? 'bg-on-primary text-primary'
                      : isDone
                        ? 'bg-success text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  {isDone ? (
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      check
                    </span>
                  ) : (
                    i + 1
                  )}
                </span>
                {t(`newProject.step.${s.key}`, {}, { defaultValue: s.defaultLabel })}
              </button>
              {i < STEPS.length - 1 && (
                <span className={cm.cn('text-on-surface-variant')} aria-hidden="true">
                  ›
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {step === 'upload' && (
        <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6 items-start')}>
          <div className={cm.cn('lg:col-span-2', cm.flex({ direction: 'col', gap: 'md' }))}>
            <button
              type="button"
              data-mol-id="np-upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const file = e.dataTransfer.files?.[0]
                void handleFile(file)
              }}
              className={cm.cn(
                cm.sp('p', 8),
                cm.w('full'),
                'rounded-2xl border-2 border-dashed text-center cursor-pointer ',
                isDragging
                  ? 'border-primary bg-primary-fixed/40'
                  : 'border-outline-variant/40 bg-surface-container-lowest hover:border-primary',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-5xl text-primary')}
                aria-hidden="true"
              >
                cloud_upload
              </span>
              <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
                {t(
                  'newProject.uploadHeading',
                  {},
                  { defaultValue: 'Drop files to start translating' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {t(
                  'newProject.uploadHint',
                  {},
                  { defaultValue: 'or click to browse — .json, .csv, .tsv, .txt supported.' },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm', wrap: 'wrap' }),
                  cm.sp('mt', 6),
                )}
              >
                {['.json', '.csv', '.tsv', '.txt'].map((f) => (
                  <span
                    key={f}
                    className={cm.cn(
                      'px-3 py-1 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed text-xs font-mono font-medium',
                    )}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.tsv,.txt,application/json,text/csv,text/tab-separated-values,text/plain"
              data-mol-id="np-upload-input"
              className={cm.cn('hidden')}
              onChange={(e) => {
                const file = e.target.files?.[0]
                void handleFile(file)
              }}
            />
            {uploadedFileName && (
              <div
                role="status"
                data-mol-id="np-upload-status"
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  'rounded-xl bg-success-light text-success',
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    task_alt
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(
                      'newProject.uploadParsed',
                      { count: uploadedSegments.length, file: uploadedFileName },
                      { defaultValue: '{{file}} — {{count}} segments ready to import.' },
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearUpload}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'rounded-full bg-success-light hover:bg-success/20',
                  )}
                >
                  {t('newProject.uploadClear', {}, { defaultValue: 'Clear' })}
                </button>
              </div>
            )}
            {uploadError && (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('p', 3),
                  'rounded-xl bg-error-container text-on-error-container text-sm',
                )}
              >
                {uploadError}
              </div>
            )}
          </div>
          <aside
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-surface-container/50',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 3),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('newProject.tipsHeading', {}, { defaultValue: 'What to upload' })}
            </h3>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
              <li className={cm.flex({ align: 'start', gap: 'sm' })}>
                <span
                  className={cm.cn('material-symbols-outlined text-primary text-base mt-0.5')}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span>
                  {t(
                    'newProject.tip.json',
                    {},
                    { defaultValue: 'i18next .json files (key/value or array of strings).' },
                  )}
                </span>
              </li>
              <li className={cm.flex({ align: 'start', gap: 'sm' })}>
                <span
                  className={cm.cn('material-symbols-outlined text-primary text-base mt-0.5')}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span>
                  {t(
                    'newProject.tip.csv',
                    {},
                    { defaultValue: 'CSV / TSV — first column becomes the source segment.' },
                  )}
                </span>
              </li>
              <li className={cm.flex({ align: 'start', gap: 'sm' })}>
                <span
                  className={cm.cn('material-symbols-outlined text-primary text-base mt-0.5')}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span>
                  {t(
                    'newProject.tip.txt',
                    {},
                    { defaultValue: 'Plain text — each non-empty line becomes a segment.' },
                  )}
                </span>
              </li>
              <li className={cm.flex({ align: 'start', gap: 'sm' })}>
                <span
                  className={cm.cn('material-symbols-outlined text-primary text-base mt-0.5')}
                  aria-hidden="true"
                >
                  info
                </span>
                <span className={cm.cn('text-on-surface-variant')}>
                  {t(
                    'newProject.tip.optional',
                    {},
                    {
                      defaultValue:
                        'Skip this step to start with an empty project — segments can be added in the editor.',
                    },
                  )}
                </span>
              </li>
            </ul>
          </aside>
        </section>
      )}

      {step === 'languages' && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-surface-container/50',
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 4),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('newProject.languagesHeading', {}, { defaultValue: 'Selected language pairs' })}
          </h3>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            {targets.map((lang) => (
              <LanguagePairBadge key={lang} source="en" target={lang} />
            ))}
            <button
              onClick={() => setShowAddTarget((prev) => !prev)}
              type="button"
              aria-expanded={showAddTarget}
              className={cm.cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono font-semibold border border-dashed border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low ',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                {showAddTarget ? 'close' : 'add'}
              </span>
              {showAddTarget
                ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                : t('newProject.addLanguage', {}, { defaultValue: 'Add target' })}
            </button>
          </div>
          {showAddTarget && (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                cm.sp('mt', 4),
              )}
            >
              {TARGET_SUGGESTIONS.filter((s) => !targets.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAddTarget(s)}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface hover:bg-primary-fixed ',
                  )}
                >
                  <LanguagePairBadge source="en" target={s} size="sm" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 'workflow' && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'lg' }),
            'rounded-2xl bg-surface-container-lowest border border-surface-container/50',
          )}
        >
          <div>
            <label
              htmlFor="np-name"
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 2),
                'block font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('newProject.nameLabel', {}, { defaultValue: 'Project name' })}
            </label>
            <input
              id="np-name"
              data-mol-id="np-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(
                'newProject.projectHint',
                {},
                { defaultValue: 'e.g. Q3 marketing site' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none',
              )}
            />
          </div>
          <div>
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mb', 4),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('newProject.assistHeading', {}, { defaultValue: 'AI assistance mode' })}
            </h3>
            <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
              {ASSIST_MODES.map((mode) => {
                const isActive = mode.key === assist
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setAssist(mode.key)}
                    className={cm.cn(
                      cm.sp('p', 4),
                      cm.flex({ direction: 'col', align: 'start', gap: 'sm' }),
                      'rounded-xl border-2 text-left ',
                      isActive
                        ? 'border-primary bg-primary-fixed/40'
                        : 'border-outline-variant/30 hover:border-primary/40',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-2xl text-primary')}
                      aria-hidden="true"
                    >
                      {mode.icon}
                    </span>
                    <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                      {t(`newProject.assist.${mode.key}`, {}, { defaultValue: mode.defaultLabel })}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label
              htmlFor="np-deadline"
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 2),
                'block font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('newProject.deadlineLabel', {}, { defaultValue: 'Deadline' })}
            </label>
            <input
              id="np-deadline"
              data-mol-id="np-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg bg-surface-container-low border-0 focus:ring-2 focus:ring-primary/30 focus:outline-none',
              )}
            />
          </div>
          {createError && (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('p', 3),
                'rounded-xl bg-error-container text-on-error-container text-sm',
              )}
            >
              {createError}
            </div>
          )}
        </section>
      )}

      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }))}>
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-full text-on-surface-variant hover:text-on-surface ',
          )}
        >
          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
        </button>
        <button
          type="button"
          disabled={creating}
          onClick={() => {
            const idx = STEPS.findIndex((s) => s.key === step)
            if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key)
            else void handleCreate()
          }}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-full inline-flex items-center gap-2 text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 shadow-sm shadow-primary/30 disabled:opacity-60',
          )}
        >
          {step === 'workflow'
            ? creating
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('newProject.create', {}, { defaultValue: 'Create project' })
            : t('common.continue', {}, { defaultValue: 'Continue' })}
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  )
}

export default NewProject
export { NewProject as NewProjectPage }
