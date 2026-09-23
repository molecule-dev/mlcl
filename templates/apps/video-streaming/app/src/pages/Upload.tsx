import { useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ACCENT_COLOR, APP_NAME, BRAND_COLOR } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

type Stage = 'choose' | 'details' | 'visibility'

const STAGES: Stage[] = ['choose', 'details', 'visibility']

const STAGE_LABEL: Record<Stage, string> = {
  choose: 'Upload',
  details: 'Details',
  visibility: 'Visibility',
}

const VISIBILITY_OPTIONS = [
  {
    key: 'public',
    defaultLabel: 'Public',
    defaultDescription: 'Anyone with a link or who lands on your channel can watch.',
    icon: 'public',
  },
  {
    key: 'unlisted',
    defaultLabel: 'Unlisted',
    defaultDescription: 'Only people with the link can find this video.',
    icon: 'link',
  },
  {
    key: 'private',
    defaultLabel: 'Private',
    defaultDescription: 'Only you can watch — until you publish it.',
    icon: 'lock',
  },
] as const
type Visibility = (typeof VISIBILITY_OPTIONS)[number]['key']

export function Upload() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [stage, setStage] = useState<Stage>('choose')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [submitting, setSubmitting] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const stageIndex = STAGES.indexOf(stage)

  const handlePublish = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    setPublishError(null)
    try {
      // The videos schema accepts a single `tag` string, not the
      // comma-separated `tags` UI. We promote the first comma-separated
      // entry as the canonical tag and let the rest live in the
      // description so the metadata isn't lost.
      const allTags = tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const primaryTag = allTags[0]
      const extraTags = allTags.slice(1)
      const descriptionWithTags =
        extraTags.length > 0
          ? `${description.trim()}\n\nTags: ${extraTags.join(', ')}`.trim()
          : description.trim()
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: descriptionWithTags,
        category: 'general',
      }
      if (primaryTag) body.tag = primaryTag
      // The visibility selector is presentational only in v1 — the API
      // exposes a single `published`/`processing` distinction (a `hls_url`
      // promotes the row to published; without it the upload sits in
      // processing). We don't have a transcoder pipeline wired in v1, so
      // leave the row as `processing` which is the API default.
      const res = await http.post('/api/videos', body)
      const created = unwrapSingle<{ id?: string }>(res?.data) ?? {}
      track({
        name: 'upload.completed',
        properties: { videoId: String(created.id ?? ''), tag: primaryTag ?? '' },
      })
      navigate('/studio')
    } catch (_error) {
      // Inline, retryable feedback — never a silent stop-the-spinner failure.
      setPublishError(
        t('upload.publishError', {}, { defaultValue: 'Publishing failed — please try again.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-8')}>
      <header className={cm.cn('space-y-2')}>
        <p className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('upload.eyebrow', { appName: APP_NAME }, { defaultValue: 'Publish to {{appName}}' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}>
          {t('upload.heading', {}, { defaultValue: 'Upload a video' })}
        </h1>
      </header>

      {/* gap + connector shrink below `sm` so all three steps fit a 390px
          column instead of clipping the Visibility step off-screen. */}
      <ol className={cm.cn('flex items-center gap-2 sm:gap-4')}>
        {STAGES.map((s, i) => {
          const reached = i <= stageIndex
          return (
            <li key={s} className={cm.flex({ align: 'center', gap: 'sm' })}>
              <div
                className={cm.cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold tabular-nums shrink-0 shadow',
                  reached
                    ? 'text-white'
                    : 'bg-surface-container-low text-on-surface-variant border border-outline-variant',
                )}
                style={
                  reached
                    ? { background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }
                    : undefined
                }
              >
                {i + 1}
              </div>
              <span
                className={cm.cn(
                  'text-xs font-bold uppercase tracking-widest whitespace-nowrap',
                  reached ? 'text-on-surface' : 'text-on-surface-variant',
                )}
              >
                {t(`upload.stage.${s}`, {}, { defaultValue: STAGE_LABEL[s] })}
              </span>
              {i < STAGES.length - 1 && (
                <span
                  className={cm.cn(
                    'w-6 sm:w-12 h-[2px] bg-outline-variant shrink-0 hidden sm:block',
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>

      {stage === 'choose' && (
        <section className={cm.cn('space-y-4')}>
          <div
            className={cm.cn(
              'relative rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center hover:border-primary transition-colors',
            )}
          >
            <div
              className={cm.cn(
                'mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow',
              )}
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }}
              aria-hidden="true"
            >
              <span
                className={cm.cn('material-symbols-outlined text-[40px] text-white')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                upload
              </span>
            </div>
            <h2 className={cm.cn('mt-6 text-2xl font-extrabold tracking-tight')}>
              {t(
                'upload.dropzoneHeading',
                {},
                { defaultValue: 'Drag a file here, or click to choose' },
              )}
            </h2>
            <p className={cm.cn('mt-2 text-sm text-on-surface-variant max-w-md mx-auto')}>
              {t(
                'upload.dropzoneSub',
                {},
                {
                  defaultValue:
                    'MP4, MOV, or WebM up to 8 GB. We\u2019ll generate captions and chapters automatically.',
                },
              )}
            </p>
            <button
              type="button"
              onClick={() => setStage('details')}
              className={cm.cn(
                'mt-6 inline-flex items-center gap-2 px-6 h-11 rounded-full text-sm font-bold uppercase tracking-widest text-white shadow hover:opacity-90 transition-opacity',
              )}
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }}
            >
              {t('upload.chooseFileCta', {}, { defaultValue: 'Choose a file' })}
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </div>

          <ul className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-3 text-xs')}>
            <li
              className={cm.cn('bg-surface-container-lowest rounded-xl p-4 flex items-start gap-3')}
            >
              <span
                className={cm.cn('material-symbols-outlined text-primary mt-0.5')}
                aria-hidden="true"
              >
                closed_caption
              </span>
              <span>
                <strong className={cm.cn('block text-sm')}>
                  {t('upload.tipCaptionsTitle', {}, { defaultValue: 'Auto captions' })}
                </strong>
                {t(
                  'upload.tipCaptionsBody',
                  {},
                  { defaultValue: 'Generated in 90+ languages within minutes.' },
                )}
              </span>
            </li>
            <li
              className={cm.cn('bg-surface-container-lowest rounded-xl p-4 flex items-start gap-3')}
            >
              <span
                className={cm.cn('material-symbols-outlined text-error mt-0.5')}
                aria-hidden="true"
              >
                view_module
              </span>
              <span>
                <strong className={cm.cn('block text-sm')}>
                  {t('upload.tipChaptersTitle', {}, { defaultValue: 'Smart chapters' })}
                </strong>
                {t(
                  'upload.tipChaptersBody',
                  {},
                  { defaultValue: 'AI suggests chapter cuts you can edit.' },
                )}
              </span>
            </li>
            <li
              className={cm.cn('bg-surface-container-lowest rounded-xl p-4 flex items-start gap-3')}
            >
              <span
                className={cm.cn('material-symbols-outlined text-success mt-0.5')}
                aria-hidden="true"
              >
                verified
              </span>
              <span>
                <strong className={cm.cn('block text-sm')}>
                  {t('upload.tipCopyrightTitle', {}, { defaultValue: 'Copyright check' })}
                </strong>
                {t(
                  'upload.tipCopyrightBody',
                  {},
                  { defaultValue: 'Music ID runs while you fill in details.' },
                )}
              </span>
            </li>
          </ul>
        </section>
      )}

      {stage === 'details' && (
        <section className={cm.cn('space-y-5 max-w-2xl')}>
          <div className={cm.cn('space-y-2')}>
            <label
              htmlFor="upload-title"
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.title', {}, { defaultValue: 'Title' })}
            </label>
            <input
              id="upload-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(
                'upload.titlePlaceholder',
                {},
                { defaultValue: 'Add a title that captures your video' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                'w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
              )}
            />
          </div>
          <div className={cm.cn('space-y-2')}>
            <label
              htmlFor="upload-description"
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.description', {}, { defaultValue: 'Description' })}
            </label>
            <textarea
              id="upload-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder={t(
                'upload.descriptionPlaceholder',
                {},
                {
                  defaultValue:
                    'Tell viewers about your video — what it covers, who it\u2019s for, and timestamps.',
                },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'w-full bg-surface-container-lowest border border-outline-variant rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
              )}
            />
          </div>
          <div className={cm.cn('space-y-2')}>
            <label
              htmlFor="upload-tags"
              className={cm.cn(
                'text-[11px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('upload.tagsLabel', {}, { defaultValue: 'Tags · comma-separated' })}
            </label>
            <input
              id="upload-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t(
                'upload.tagsPlaceholder',
                {},
                { defaultValue: 'film, archive, brooklyn, documentary' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                'w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
              )}
            />
          </div>

          <div className={cm.cn('flex items-center gap-3 pt-2')}>
            <button
              type="button"
              onClick={() => setStage('choose')}
              className={cm.cn(
                'px-5 h-11 rounded-full text-sm font-bold uppercase tracking-widest border border-outline-variant hover:bg-surface-container-low transition-colors',
              )}
            >
              {t('common.back', {}, { defaultValue: 'Back' })}
            </button>
            <button
              type="button"
              onClick={() => setStage('visibility')}
              className={cm.cn(
                'ml-auto inline-flex items-center gap-2 px-6 h-11 rounded-full text-sm font-bold uppercase tracking-widest text-white shadow hover:opacity-90 transition-opacity',
              )}
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }}
            >
              {t('common.continue', {}, { defaultValue: 'Continue' })}
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </div>
        </section>
      )}

      {stage === 'visibility' && (
        <section className={cm.cn('space-y-5 max-w-2xl')}>
          <ul className={cm.cn('space-y-3')}>
            {VISIBILITY_OPTIONS.map((opt) => {
              const active = visibility === opt.key
              return (
                <li key={opt.key}>
                  <button
                    type="button"
                    onClick={() => setVisibility(opt.key)}
                    className={cm.cn(
                      'w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-colors text-left',
                      active
                        ? 'bg-primary/5 border-primary shadow'
                        : 'bg-surface-container-lowest border-outline-variant hover:border-primary/40',
                    )}
                    aria-pressed={active}
                  >
                    <span
                      className={cm.cn(
                        'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
                        active
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[24px]')}
                        aria-hidden="true"
                      >
                        {opt.icon}
                      </span>
                    </span>
                    <span className={cm.cn('flex-1')}>
                      <strong className={cm.cn('block text-base font-extrabold tracking-tight')}>
                        {t(
                          `upload.visibility.${opt.key}.label`,
                          {},
                          { defaultValue: opt.defaultLabel },
                        )}
                      </strong>
                      <span className={cm.cn('block text-sm text-on-surface-variant')}>
                        {t(
                          `upload.visibility.${opt.key}.description`,
                          {},
                          { defaultValue: opt.defaultDescription },
                        )}
                      </span>
                    </span>
                    {active && (
                      <span
                        className={cm.cn('material-symbols-outlined text-primary')}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          {publishError && (
            <p
              role="alert"
              className={cm.cn(
                'px-4 py-3 rounded-xl bg-error-container text-on-error-container text-sm',
              )}
            >
              {publishError}
            </p>
          )}

          <div className={cm.cn('flex items-center gap-3 pt-2')}>
            <button
              type="button"
              onClick={() => setStage('details')}
              className={cm.cn(
                'px-5 h-11 rounded-full text-sm font-bold uppercase tracking-widest border border-outline-variant hover:bg-surface-container-low transition-colors',
              )}
            >
              {t('upload.backCta', {}, { defaultValue: 'Back' })}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={submitting}
              className={cm.cn(
                'ml-auto inline-flex items-center gap-2 px-7 h-11 rounded-full text-sm font-bold uppercase tracking-widest text-white shadow hover:opacity-90 transition-opacity disabled:opacity-60',
              )}
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, ${ACCENT_COLOR})` }}
            >
              {submitting
                ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                : t('common.publish', {}, { defaultValue: 'Publish' })}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
