import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { MoodLevel } from '../components/MoodHeroCard.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface JournalEntryDetail {
  id: string
  date: string
  title: string
  body: string
  mood: MoodLevel
  tags: string[]
  word_count: number
  reflections?: { kind: 'gratitude' | 'insight' | 'trigger'; text: string }[]
}

const MOOD_META: Record<MoodLevel, { label: string; color: string; icon: string }> = {
  radiant: { label: 'Radiant', color: 'var(--color-mood-radiant-dot)', icon: 'mood' },
  good: { label: 'Good', color: 'var(--color-mood-good-dot)', icon: 'sentiment_satisfied' },
  neutral: { label: 'Neutral', color: 'var(--color-mood-neutral-dot)', icon: 'sentiment_neutral' },
  low: { label: 'Low', color: 'var(--color-mood-low-dot)', icon: 'sentiment_dissatisfied' },
  struggling: {
    label: 'Struggling',
    color: 'var(--color-mood-struggling-dot)',
    icon: 'sentiment_very_dissatisfied',
  },
}

const KIND_META: Record<
  NonNullable<JournalEntryDetail['reflections']>[number]['kind'],
  { label: string; icon: string; color: string }
> = {
  gratitude: { label: 'Gratitude', icon: 'volunteer_activism', color: 'rgba(16, 185, 129, 0.18)' },
  insight: { label: 'Insight', icon: 'auto_awesome', color: 'rgba(99, 102, 241, 0.18)' },
  trigger: { label: 'Trigger', icon: 'flag_circle', color: 'rgba(249, 115, 22, 0.18)' },
}

export function EntryDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [entry, setEntry] = useState<JournalEntryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorCode, setErrorCode] = useState<'not-found' | 'load-failed' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setErrorCode(null)
    http
      .get(`/api/journal/entries/${id}`)
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<JournalEntryDetail>(res)
        if (data && (data as JournalEntryDetail).body !== undefined) {
          setEntry(data)
        } else {
          // Flag only; translated at render (identity churn on `t` must not
          // re-trigger the fetch).
          setErrorCode('not-found')
        }
      })
      .catch(() => {
        if (!cancelled) setErrorCode('load-failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  if (loading || !entry) {
    return (
      <div
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-8')}
      >
        <Link
          to="/journal"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('entryDetail.back', {}, { defaultValue: 'Back to journal' })}
        </Link>
        {errorCode ? (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-error')} role="alert">
            {errorCode === 'not-found'
              ? t('entryDetail.notFound', {}, { defaultValue: 'Entry not found.' })
              : t('entryDetail.loadError', {}, { defaultValue: 'Could not load this entry.' })}
          </p>
        ) : (
          <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('entryDetail.loading', {}, { defaultValue: 'Loading reflection…' })}
          </p>
        )}
      </div>
    )
  }

  const meta = MOOD_META[entry.mood]
  const dateStr = new Date(entry.date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await http.delete(`/api/journal/entries/${id}`)
      // Domain event at the commit point (no-op without a provider bonded).
      void track({ name: 'entry.deleted', properties: { entry_id: id } })
      navigate('/journal', { replace: true })
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('entryDetail.deleteError', {}, { defaultValue: 'Could not delete this entry.' }),
      )
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-8')}>
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <Link
          to="/journal"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('entryDetail.back', {}, { defaultValue: 'Back to journal' })}
        </Link>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              'rounded-full text-[11px] uppercase tracking-widest',
            )}
            style={{ backgroundColor: meta.color, color: 'white' }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              {meta.icon}
            </span>
            {t(`entryDetail.mood.${entry.mood}`, {}, { defaultValue: meta.label })}
          </span>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label={t('entryDetail.delete', {}, { defaultValue: 'Delete this entry' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-10 h-10 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container transition-colors',
            )}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              delete
            </span>
          </button>
        </div>
      </div>

      {confirmDelete ? (
        <div
          role="alertdialog"
          aria-label={t('entryDetail.deleteConfirmTitle', {}, { defaultValue: 'Delete entry' })}
          className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-error-container space-y-3')}
        >
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-error-container')}>
            {t(
              'entryDetail.deleteConfirm',
              {},
              {
                defaultValue: 'Delete this reflection? This can’t be undone.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              data-testid="delete-entry-confirm"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-error text-on-error hover:bg-error/90 transition-colors disabled:opacity-50',
              )}
            >
              {deleting
                ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                : t('entryDetail.deleteForever', {}, { defaultValue: 'Delete forever' })}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full border-2 border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50',
              )}
            >
              {t('entryDetail.keepEntry', {}, { defaultValue: 'Keep it' })}
            </button>
          </div>
          {deleteError ? (
            <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {deleteError}
            </p>
          ) : null}
        </div>
      ) : null}

      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {dateStr}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {entry.title}
        </h1>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('mt', 4),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'text-on-surface-variant',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            lock
          </span>
          {t('entryDetail.encryptedBadge', {}, { defaultValue: 'End-to-end encrypted' })}
          <span aria-hidden="true">·</span>
          <span className={cm.fontWeight('bold')}>
            {t(
              'common.countWords',
              { count: entry.word_count },
              { defaultValue: '{{count}} words' },
            )}
          </span>
        </div>
      </header>

      <article
        className={cm.cn(
          cm.sp('p', 8),
          cm.accentCard({ tone: 'custom' }),
          'bg-surface-container-lowest rounded-2xl shadow-sm',
        )}
        style={{ ['--mol-accent' as string]: meta.color, fontFamily: '"Lora", Georgia, serif' }}
      >
        {entry.body.split(/\n\n+/).map((para, i) => (
          <p
            key={i}
            className={cm.cn(cm.textSize('lg'), cm.sp('mb', 4), 'leading-loose text-on-surface')}
          >
            {para}
          </p>
        ))}
      </article>

      <section className={cm.cn('space-y-3')}>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('form.tags', {}, { defaultValue: 'Tags' })}
        </h3>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className={cm.cn(
                cm.sp('px', 3),
                cm.fontWeight('medium'),
                'rounded-full text-[11px] py-0.5',
              )}
              style={{
                backgroundColor: 'rgba(167, 139, 250, 0.18)',
                color: 'var(--mol-color-primary)',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      </section>

      {entry.reflections && entry.reflections.length > 0 ? (
        <section className={cm.cn('space-y-3')}>
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('entryDetail.reflectionsHeading', {}, { defaultValue: 'AI reflections' })}
          </h3>
          <div className={cm.cn('space-y-3')}>
            {entry.reflections.map((r, i) => {
              const km = KIND_META[r.kind]
              return (
                <div
                  key={i}
                  className={cm.cn(cm.sp('p', 5), 'rounded-2xl shadow-sm flex items-start gap-3')}
                  style={{ backgroundColor: km.color }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-2xl shrink-0')}
                    aria-hidden="true"
                    style={{ color: 'var(--mol-color-primary)', fontVariationSettings: "'FILL' 1" }}
                  >
                    {km.icon}
                  </span>
                  <div>
                    <p
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t(`entryDetail.reflectionKind.${r.kind}`, {}, { defaultValue: km.label })}
                    </p>
                    <p
                      className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface italic')}
                    >
                      {r.text}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
