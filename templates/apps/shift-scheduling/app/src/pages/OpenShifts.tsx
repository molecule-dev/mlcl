import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface OpenShift {
  id: string
  role: string
  date: string
  start_time: string
  end_time: string
  time_label: string
  duration_hours: number
  published: boolean
  notes: string
}

interface StaffOption {
  id: string
  name: string
  avatar_initial: string
  role: string
}

interface ClaimRow {
  id: string
  shift_id: string
  staff_name: string
  status: 'pending' | 'approved' | 'denied'
}

export function OpenShifts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [shifts, setShifts] = useState<OpenShift[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [claims, setClaims] = useState<ClaimRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [claimFor, setClaimFor] = useState<OpenShift | null>(null)
  const [claimStaffId, setClaimStaffId] = useState('')
  const [claimError, setClaimError] = useState<string | null>(null)

  function refresh(): Promise<void> {
    return Promise.all([
      http.get('/api/open-shifts'),
      http.get('/api/staff'),
      http.get('/api/claims'),
    ])
      .then(([oRes, sRes, cRes]) => {
        setShifts(unwrapList<OpenShift>(oRes))
        setStaff(unwrapList<StaffOption>(sRes))
        setClaims(unwrapList<ClaimRow>(cRes))
      })
      .catch(() => {
        setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/open-shifts').catch(() => null),
      http.get('/api/staff').catch(() => null),
      http.get('/api/claims').catch(() => null),
    ])
      .then(([oRes, sRes, cRes]) => {
        if (cancelled) return
        setShifts(unwrapList<OpenShift>(oRes))
        setStaff(unwrapList<StaffOption>(sRes))
        setClaims(unwrapList<ClaimRow>(cRes))
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  function myClaim(shiftId: string): ClaimRow | undefined {
    return claims.find((c) => c.shift_id === shiftId && c.status === 'pending')
  }

  async function submitClaim(): Promise<void> {
    if (!claimFor) return
    setClaimError(null)
    if (!claimStaffId) {
      setClaimError(t('openShifts.pickStaff', {}, { defaultValue: 'Pick who is claiming.' }))
      return
    }
    setActingId(claimFor.id)
    try {
      const created = await http.post('/api/claims', {
        shift_id: claimFor.id,
        staff_id: claimStaffId,
      })
      const claim = unwrapSingle<{ id: string }>(created)
      void track({
        name: 'claim.submitted',
        properties: { claim_id: claim?.id, shift_id: claimFor.id, staff_id: claimStaffId },
      })
      setClaimFor(null)
      setClaimStaffId('')
      await refresh()
    } catch (err) {
      const msg =
        (err && typeof err === 'object' && 'message' in err ? String(err.message) : '') ||
        t('openShifts.claimFailed', {}, { defaultValue: 'Claim failed.' })
      setClaimError(msg)
    } finally {
      setActingId(null)
    }
  }

  const sorted = [...shifts].sort(
    (a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time),
  )

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.stack(6))}>
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}>
          {t('openShifts.eyebrow', {}, { defaultValue: 'Claim board' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('openShifts.heading', {}, { defaultValue: 'Open shifts' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t(
            'openShifts.subheading',
            {},
            {
              defaultValue:
                'Published shifts without an assignee — claim one and the manager approves.',
            },
          )}
        </p>
      </header>

      {loading ? (
        <p className={cm.cn('text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-error')}>{error}</p>
      ) : sorted.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'openShifts.empty',
            {},
            { defaultValue: 'No open shifts — the week is fully staffed.' },
          )}
        </p>
      ) : (
        <ul className={cm.grid({ cols: 3, gap: 'md' })}>
          {sorted.map((s) => {
            const mine = myClaim(s.id)
            return (
              <li
                key={s.id}
                data-mol-id={`open-shift-${s.id}`}
                className={cm.cn(
                  cm.sp('p', 5),
                  'rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/50 shadow-sm',
                  cm.stack(3),
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'rounded-full uppercase tracking-wider bg-primary/10 text-primary-dark',
                    )}
                  >
                    {s.role}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
                  >
                    {s.duration_hours}
                    {t('shiftDetail.hours', { count: s.duration_hours }, { defaultValue: 'h' })}
                  </span>
                </div>
                <div>
                  <p
                    className={cm.cn(
                      cm.textSize('lg'),
                      'font-extrabold tabular-nums text-on-surface',
                    )}
                  >
                    {s.date}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface-variant')}>
                    {s.time_label}
                  </p>
                </div>
                {s.notes ? (
                  <p
                    className={cm.cn(cm.textSize('xs'), 'leading-relaxed text-on-surface-variant')}
                  >
                    {s.notes}
                  </p>
                ) : null}
                {mine ? (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-semibold text-[color:var(--color-req-pending)]',
                    )}
                  >
                    {t(
                      'openShifts.youClaimed',
                      { name: mine.staff_name },
                      { defaultValue: '{{name}} — awaiting approval' },
                    )}
                  </p>
                ) : (
                  <button
                    type="button"
                    data-mol-id={`open-shift-claim-${s.id}`}
                    onClick={() => {
                      setClaimFor(s)
                      setClaimError(null)
                    }}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity w-full',
                    )}
                  >
                    {t('openShifts.claim', {}, { defaultValue: 'Claim shift' })}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {claimFor ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('openShifts.dialogLabel', {}, { defaultValue: 'Claim this shift' })}
          className={cm.cn('fixed inset-0 z-50 grid place-items-center bg-black/40 p-4')}
        >
          <div
            data-mol-id="open-shift-claim-dialog"
            className={cm.cn(
              cm.sp('p', 6),
              'w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-lg',
              cm.stack(4),
            )}
          >
            <div>
              <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold text-on-surface')}>
                {t('openShifts.dialogHeading', {}, { defaultValue: 'Claim shift' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {claimFor.role} · {claimFor.date} · {claimFor.time_label}
              </p>
            </div>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('openShifts.claimingAs', {}, { defaultValue: 'Claiming as' })}
              </span>
              <select
                value={claimStaffId}
                onChange={(e) => setClaimStaffId(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
                )}
              >
                <option value="">
                  {t('openShifts.pickStaff', {}, { defaultValue: 'Pick who is claiming.' })}
                </option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.role}
                  </option>
                ))}
              </select>
            </label>
            {claimError ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-error font-semibold')}>{claimError}</p>
            ) : null}
            <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
              <button
                type="button"
                onClick={() => setClaimFor(null)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                data-mol-id="open-shift-claim-submit"
                onClick={submitClaim}
                disabled={actingId === claimFor.id}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50',
                )}
              >
                {actingId === claimFor.id
                  ? t('common.submittingEllipsis', {}, { defaultValue: 'Submitting…' })
                  : t('openShifts.submitClaim', {}, { defaultValue: 'Submit claim' })}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
        {t(
          'openShifts.manageHint',
          {},
          {
            defaultValue: 'Managers approve claims from the shift detail page — ',
          },
        )}{' '}
        <Link
          to="/swap-requests"
          className={cm.cn(
            cm.sp('px', 1),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'inline-flex items-center rounded text-primary-dark hover:underline',
          )}
        >
          {t('openShifts.reviewLink', {}, { defaultValue: 'review pending approvals →' })}
        </Link>
      </p>
    </div>
  )
}
