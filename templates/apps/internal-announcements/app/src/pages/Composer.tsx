/**
 * Composer — /compose new announcement editor.
 *
 * Submits a real announcement to POST /api/announcements with
 * `publish_now=true` so the row appears in the live feed immediately,
 * with the correct (priority, is_pinned) tuple translated from the
 * priority bucket selector.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type AnnouncementPriority, PRIORITY_BORDER_COLOR } from '../components/PriorityPill.js'
import {
  type ApiAnnouncement,
  type ApiCategory,
  categoryColor,
  fromCardPriority,
} from '../lib/announcements.js'

const PRIORITY_OPTIONS: Array<{
  id: AnnouncementPriority
  icon: string
  labelKey: string
  defaultLabel: string
  descKey: string
  defaultDesc: string
}> = [
  {
    id: 'urgent',
    icon: 'priority_high',
    labelKey: 'composer.priorityUrgent',
    defaultLabel: 'Urgent',
    descKey: 'composer.priorityUrgentDesc',
    defaultDesc: 'Read immediately. Pinged on every channel.',
  },
  {
    id: 'pinned',
    icon: 'push_pin',
    labelKey: 'composer.priorityPinned',
    defaultLabel: 'Pinned',
    descKey: 'composer.priorityPinnedDesc',
    defaultDesc: 'Stay at the top of the feed for a week.',
  },
  {
    id: 'normal',
    icon: 'campaign',
    labelKey: 'composer.priorityNormal',
    defaultLabel: 'Normal',
    descKey: 'composer.priorityNormalDesc',
    defaultDesc: 'Default. Acknowledgment requested.',
  },
  {
    id: 'fyi',
    icon: 'info',
    labelKey: 'composer.priorityFyi',
    defaultLabel: 'FYI',
    descKey: 'composer.priorityFyiDesc',
    defaultDesc: 'No ack needed. Just sharing.',
  },
]

export function Composer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [priority, setPriority] = useState<AnnouncementPriority>('normal')
  const [categoryId, setCategoryId] = useState<string>('')
  const [requiresAck, setRequiresAck] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiCategory[]>('/categories')
      .then((r) => {
        if (cancelled) return
        setCategories(r.data)
        if (r.data.length > 0 && !categoryId) {
          const company = r.data.find((c) => c.name === 'company')
          setCategoryId(company?.id ?? r.data[0].id)
        }
      })
      .catch((_error) => {
        // surfaces in select empty state; no action needed here
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http]) // categoryId intentionally omitted — runs once on mount to seed the initial category

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  )

  const accent = PRIORITY_BORDER_COLOR[priority]
  const isReady = useMemo(
    () => title.trim().length >= 8 && body.trim().length >= 20 && categoryId !== '',
    [title, body, categoryId],
  )

  const handlePublish = async () => {
    if (!isReady || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { priority: backendPriority, is_pinned } = fromCardPriority(priority)
      const r = await http.post<ApiAnnouncement>('/announcements', {
        title: title.trim(),
        body: body.trim(),
        category_id: categoryId,
        priority: backendPriority,
        is_pinned,
        requires_acknowledgment: requiresAck,
        publish_now: true,
      })
      const created = r.data
      if (created?.id) {
        navigate(`/announcement/${created.id}`)
      } else {
        navigate('/feed')
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('composer.eyebrow', {}, { defaultValue: 'New announcement' })}
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-3xl md:text-4xl tracking-tight text-on-surface',
          )}
        >
          {t('composer.title', {}, { defaultValue: 'Say it once. Make it count.' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl leading-relaxed')}>
          {t(
            'composer.subtitle',
            {},
            {
              defaultValue:
                'Choose a priority and a channel, write the body, and decide whether you need an explicit acknowledgment.',
            },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/40 bg-surface shadow-sm',
        )}
        style={{ borderLeftWidth: '6px', borderLeftColor: accent }}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.priority', {}, { defaultValue: 'Priority' })}
          </label>
          <div className={cm.cn('grid gap-2 grid-cols-2 lg:grid-cols-4')}>
            {PRIORITY_OPTIONS.map((opt) => {
              const isActive = opt.id === priority
              const optAccent = PRIORITY_BORDER_COLOR[opt.id]
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`composer-priority-${opt.id}`}
                  onClick={() => setPriority(opt.id)}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'xs' }),
                    cm.sp('p', 3),
                    'rounded-xl border text-left transition-all hover:-translate-y-0.5',
                    !isActive && 'border-outline-variant/40 bg-transparent',
                  )}
                  style={
                    isActive
                      ? { borderColor: optAccent, backgroundColor: `${optAccent}14` }
                      : undefined
                  }
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.fontWeight('bold'),
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      style={{ color: optAccent }}
                      aria-hidden="true"
                    >
                      {opt.icon}
                    </span>
                    <span
                      className={cm.cn(cm.textSize('sm'), 'text-on-surface')}
                      style={isActive ? { color: optAccent } : undefined}
                    >
                      {t(opt.labelKey, {}, { defaultValue: opt.defaultLabel })}
                    </span>
                  </span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-snug')}
                  >
                    {t(opt.descKey, {}, { defaultValue: opt.defaultDesc })}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('composer.channelLabel', {}, { defaultValue: 'Channel' })}
          </label>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
            {categories.map((c) => {
              const isActive = c.id === categoryId
              const color = categoryColor(c)
              return (
                <button
                  key={c.id}
                  type="button"
                  data-testid={`composer-channel-${c.name}`}
                  onClick={() => setCategoryId(c.id)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.sp('px', 3),
                    'py-1.5',
                    'rounded-full border transition-colors',
                    !isActive && 'border-outline-variant/40 text-on-surface-variant',
                  )}
                  style={
                    isActive
                      ? { borderColor: color, backgroundColor: `${color}1f`, color }
                      : undefined
                  }
                >
                  <span className={cm.cn('material-symbols-outlined text-sm')} style={{ color }}>
                    {c.icon ?? 'tag'}
                  </span>
                  {c.name}
                </button>
              )
            })}
            {categories.length === 0 && (
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('composer.noChannels', {}, { defaultValue: 'Loading channels…' })}
              </span>
            )}
          </div>
          {selectedCategory && (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'composer.channelDescription',
                { name: selectedCategory.name },
                { defaultValue: 'Posting to #{{name}}.' },
              )}
            </p>
          )}
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <input
            type="text"
            data-testid="composer-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t(
              'composer.titlePlaceholder',
              {},
              { defaultValue: 'Headline — what is the one-line takeaway?' },
            )}
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'w-full text-xl rounded-lg border border-outline-variant/40 bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            )}
            maxLength={200}
          />
          <textarea
            data-testid="composer-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t(
              'composer.bodyPlaceholder',
              {},
              {
                defaultValue:
                  'Body — what changed, what does the team need to do, and by when? Markdown supported.',
              },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('base'),
              'w-full min-h-[180px] rounded-lg border border-outline-variant/40 bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary leading-relaxed',
            )}
          />
        </div>

        <label
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 3),
            'rounded-lg border border-outline-variant/30 bg-surface-container-low/40 cursor-pointer',
          )}
        >
          <input
            type="checkbox"
            data-testid="composer-require-ack"
            checked={requiresAck}
            onChange={(e) => setRequiresAck(e.target.checked)}
            className={cm.cn(cm.w(4), cm.h(4))}
            style={{ accentColor: 'var(--color-acknowledged, var(--color-acknowledged))' }}
          />
          <span className={cm.cn(cm.flex({ direction: 'col' }))}>
            <span
              className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}
            >
              {t('composer.requireAck', {}, { defaultValue: 'Require explicit acknowledgment' })}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'composer.requireAckDesc',
                {},
                {
                  defaultValue:
                    'Recipients must press Acknowledge. Unacked teammates are gently nudged after 24h.',
                },
              )}
            </span>
          </span>
        </label>

        {submitError && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 3),
              'rounded-lg border border-error/40 bg-error-container/40 text-on-error-container text-sm',
            )}
          >
            {submitError}
          </div>
        )}

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            'flex-wrap',
          )}
        >
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {isReady
              ? t('composer.readyHint', {}, { defaultValue: 'Ready to publish.' })
              : t(
                  'composer.notReadyHint',
                  {},
                  {
                    defaultValue:
                      'Title needs at least 8 characters and body at least 20 before you can publish.',
                  },
                )}
          </span>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              data-testid="composer-cancel"
              onClick={() => navigate('/feed')}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-full text-on-surface-variant hover:bg-surface-container-low/60 transition-colors',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              data-testid="composer-publish"
              disabled={!isReady || submitting}
              onClick={handlePublish}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                'rounded-full bg-primary text-on-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-active transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>send</span>
              {submitting
                ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                : t('composer.submit', {}, { defaultValue: 'Publish to channel' })}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Composer
