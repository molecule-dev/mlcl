import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { LifeTimeline } from '../components/LifeTimeline.js'
import { PersonCard } from '../components/PersonCard.js'
import {
  displayName,
  formatFullDate,
  type Person,
  type PersonDetailPayload,
  type PersonRelatives,
} from '../lib/people.js'
import { unwrapSingle } from '../lib/unwrap.js'

type RelativeGroupKey = keyof PersonRelatives

const GROUPS: Array<{ key: RelativeGroupKey; label: string; icon: string }> = [
  { key: 'parents', label: 'Parents', icon: 'family_restroom' },
  { key: 'partners', label: 'Partners', icon: 'favorite' },
  { key: 'children', label: 'Children', icon: 'child_care' },
  { key: 'siblings', label: 'Siblings', icon: 'group' },
]

export function PersonDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PersonDetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/people/${id}`)
      .then((res) => {
        if (cancelled) return
        const payload = unwrapSingle<PersonDetailPayload>(res)
        if (!payload) {
          setError(t('personDetail.notFound', {}, { defaultValue: 'Person not found.' }))
        } else {
          setData(payload)
        }
      })
      .catch((err) => {
        if (cancelled) return
        // A 404 is the expected "unknown person" outcome — surface the
        // friendly not-found copy, not the raw http error string.
        const status = (err as { status?: number })?.status
        if (status === 404) {
          setError(t('personDetail.notFound', {}, { defaultValue: 'Person not found.' }))
          return
        }
        setError(
          err instanceof Error
            ? err.message
            : t('personDetail.loadError', {}, { defaultValue: 'Failed to load person.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reload])

  if (loading) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-person-detail"
      >
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div
        className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-person-detail"
      >
        <Link
          to="/people"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline mb-3',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('personDetail.back', {}, { defaultValue: 'All people' })}
        </Link>
        {/* The banner owns the retry button's pending/disabled state; the
            reload bump remounts the page into its loading branch, so the
            promise only needs to hand the click off. */}
        <LoadErrorBanner
          className={cm.sp('py', 8)}
          message={error}
          onRetry={() => {
            setReload((n) => n + 1)
            return Promise.resolve()
          }}
          retryLabel={t('common.retry', {}, { defaultValue: 'Try again' })}
          retryMolId="person-detail-retry"
        />
      </div>
    )
  }

  const bioRows: Array<{ key: string; label: string; value: string }> = []
  const push = (key: string, label: string, value: string | null | undefined) => {
    if (value) bioRows.push({ key, label, value })
  }
  push(
    'born',
    t('personDetail.born', {}, { defaultValue: 'Born' }),
    formatFullDate(data.birth_date) +
      (data.birth_place
        ? t('personDetail.inPlace', { place: data.birth_place }, { defaultValue: ' — {{place}}' })
        : ''),
  )
  if (data.death_date) {
    push(
      'died',
      t('personDetail.died', {}, { defaultValue: 'Died' }),
      formatFullDate(data.death_date) +
        (data.death_place
          ? t('personDetail.inPlace', { place: data.death_place }, { defaultValue: ' — {{place}}' })
          : ''),
    )
  }
  if (data.maiden_name) {
    push(
      'maidenName',
      t('personDetail.maidenName', {}, { defaultValue: 'Maiden name' }),
      data.maiden_name,
    )
  }
  if (data.gender) {
    push('gender', t('personDetail.gender', {}, { defaultValue: 'Gender' }), data.gender)
  }
  const totalRelatives =
    data.relatives.parents.length +
    data.relatives.partners.length +
    data.relatives.children.length +
    data.relatives.siblings.length

  return (
    <div
      className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 6), 'lg:p-8')}
      data-mol-id="page-person-detail"
    >
      <Link
        to="/people"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-primary hover:underline mb-3',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
        {t('personDetail.back', {}, { defaultValue: 'All people' })}
      </Link>

      {/* Header */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div className="min-w-0">
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            data-mol-id="person-detail-name"
            style={{ fontFamily: 'var(--mol-font-tree)' }}
          >
            {displayName(data)}
            {data.death_date && (
              <span className={cm.cn(cm.sp('ml', 2), cm.textSize('base'))} aria-label="deceased">
                †
              </span>
            )}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 1),
              'text-on-surface-variant uppercase tracking-wider font-bold tabular-nums',
            )}
            data-mol-id="person-detail-years"
          >
            {[
              data.birth_date ? data.birth_date.slice(0, 4) : null,
              data.death_date ? data.death_date.slice(0, 4) : null,
            ]
              .filter(Boolean)
              .join(' – ') || t('personDetail.datesUnknown', {}, { defaultValue: 'Dates unknown' })}
          </p>
        </div>
        {/* wrap: the actions row must never clip "Add relative" off-screen on
            narrow phones (same overflow class as the tree toolbar). */}
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          <Link
            to={`/people/${data.id}/edit`}
            data-mol-id="person-detail-edit"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-lg border border-outline-variant/50 bg-surface-container-lowest hover:bg-surface-container transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              edit
            </span>
            {t('personDetail.edit', {}, { defaultValue: 'Edit' })}
          </Link>
          <Link
            to={`/people/${data.id}/add-relative`}
            data-mol-id="person-detail-add-relative"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'text-white rounded-lg hover:shadow-lg transition-all',
            )}
            style={{ background: 'linear-gradient(135deg, #15803d, #65a30d)' }}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              person_add
            </span>
            {t('personDetail.addRelative', {}, { defaultValue: 'Add relative' })}
          </Link>
        </div>
      </div>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        {/* Bio + timeline */}
        <div className={cm.cn('lg:col-span-2', cm.flex({ direction: 'col', gap: 'md' }))}>
          <section
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
            data-mol-id="person-detail-bio"
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
                cm.sp('mb', 3),
              )}
            >
              {t('personDetail.biography', {}, { defaultValue: 'Life details' })}
            </h2>
            <dl className={cm.cn('space-y-3')}>
              {bioRows.length === 0 && (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'personDetail.noBio',
                    {},
                    {
                      defaultValue:
                        'No dates or places recorded yet — edit this profile to add them.',
                    },
                  )}
                </p>
              )}
              {bioRows.map((r) => (
                <div key={r.key}>
                  <dt
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant uppercase tracking-wider font-bold',
                    )}
                  >
                    {r.label}
                  </dt>
                  <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{r.value}</dd>
                </div>
              ))}
            </dl>
            {data.notes && (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  'leading-relaxed text-on-surface-variant whitespace-pre-line',
                  cm.sp('mt', 4),
                  cm.sp('pt', 4),
                  'border-t border-outline-variant/30',
                )}
              >
                {data.notes}
              </p>
            )}
          </section>

          <section
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
            data-mol-id="person-detail-timeline"
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
                cm.sp('mb', 4),
              )}
            >
              {t('personDetail.timeline', {}, { defaultValue: 'Life timeline' })}
            </h2>
            <LifeTimeline events={data.timeline} />
          </section>
        </div>

        {/* Relatives */}
        <aside
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
          data-mol-id="person-detail-relatives"
        >
          <section
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          >
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
                cm.sp('mb', 4),
              )}
            >
              {t(
                'personDetail.relatives',
                { count: totalRelatives },
                { defaultValue: 'Relatives ({{count}})' },
              )}
            </h2>
            {totalRelatives === 0 && (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'personDetail.noRelatives',
                  {},
                  {
                    defaultValue:
                      'No relatives linked yet — add a parent or partner to grow the branch.',
                  },
                )}
              </p>
            )}
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
              {GROUPS.map((g) => {
                const list = data.relatives[g.key] as Person[]
                if (list.length === 0) return null
                return (
                  <div key={g.key} data-mol-id={`relative-group-${g.key}`}>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest text-on-surface-variant',
                        cm.sp('mb', 2),
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-sm align-middle"
                        aria-hidden="true"
                      >
                        {g.icon}
                      </span>{' '}
                      {t(`personDetail.group.${g.key}`, {}, { defaultValue: g.label })} (
                      {list.length})
                    </p>
                    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                      {list.map((p) => (
                        <PersonCard key={p.id} person={p} variant="list" />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default PersonDetail
