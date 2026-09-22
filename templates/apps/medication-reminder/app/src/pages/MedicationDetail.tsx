import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  formatScheduledDateTime,
  formatScheduledTime,
  type TimeFormat,
} from '../lib/scheduleFormat.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface UserWithSettings {
  oauthData?: { settings?: { appearance?: { timeFormat?: TimeFormat } } }
}

interface Medication {
  id: string
  name: string
  generic_name: string | null
  dose_amount: string
  pill_color: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'yellow'
  pill_shape: string
  schedule_summary: string
  schedule_times: string[]
  count_remaining: number
  refill_due: string | null
  prescriber: string
  pharmacy: string
  rx_number: string
  refills_remaining: number
  warnings: string[]
  created_at: string
}

interface DoseHistory {
  id: string
  medication_id: string
  scheduled_at: string
  scheduled_time?: string
  scheduled_date?: string
  status: 'taken' | 'missed' | 'upcoming' | 'skipped'
  taken_at: string | null
}

const PILL_COLOR: Record<Medication['pill_color'], string> = {
  blue: 'var(--color-pill-blue)',
  green: 'var(--color-pill-green)',
  orange: 'var(--color-pill-orange)',
  purple: 'var(--color-pill-purple)',
  pink: 'var(--color-pill-pink)',
  yellow: 'var(--color-pill-yellow)',
}

const STATUS_COLOR: Record<DoseHistory['status'], string> = {
  taken: 'var(--color-dose-taken)',
  missed: 'var(--color-dose-missed)',
  upcoming: 'var(--color-dose-upcoming)',
  skipped: 'var(--color-dose-skipped)',
}

export function MedicationDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const auth = useAuth<UserWithSettings>()
  const fmt: TimeFormat =
    auth.user?.oauthData?.settings?.appearance?.timeFormat === '24h' ? '24h' : '12h'
  const { id = '' } = useParams<{ id: string }>()
  const [med, setMed] = useState<Medication | null>(null)
  const [history, setHistory] = useState<DoseHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<{
    name: string
    dose_amount: string
    schedule_summary: string
    pharmacy: string
  }>({ name: '', dose_amount: '', schedule_summary: '', pharmacy: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [opError, setOpError] = useState<string | null>(null)

  const openEdit = () => {
    if (!med) return
    setDraft({
      name: med.name,
      dose_amount: med.dose_amount,
      schedule_summary: med.schedule_summary,
      pharmacy: med.pharmacy ?? '',
    })
    setOpError(null)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setOpError(null)
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!med) return
    setSaving(true)
    setOpError(null)
    try {
      const resp = await http.patch(`/api/medications/${med.id}`, {
        name: draft.name.trim(),
        dosage: draft.dose_amount.trim(),
        schedule_summary: draft.schedule_summary.trim(),
        pharmacy: draft.pharmacy.trim(),
      })
      const updated = unwrapSingle<Medication>(resp)
      if (updated) setMed(updated)
      void track({
        name: 'medication.updated',
        properties: { medication_id: med.id },
      })
      setEditing(false)
    } catch (error) {
      logError('medicationDetail.save', error)
      setOpError(t('medicationDetail.saveError', {}, { defaultValue: 'Failed to save changes.' }))
    } finally {
      setSaving(false)
    }
  }

  const performDelete = async () => {
    if (!med) return
    setDeleting(true)
    setOpError(null)
    try {
      await http.delete(`/api/medications/${med.id}`)
      void track({
        name: 'medication.deleted',
        properties: { medication_id: med.id },
      })
      navigate('/medications', { replace: true })
    } catch (error) {
      logError('medicationDetail.delete', error)
      setOpError(t('medicationDetail.deleteError', {}, { defaultValue: 'Failed to delete.' }))
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/api/medications/${id}`), http.get(`/api/doses?medication_id=${id}`)])
      .then(([m, h]) => {
        if (cancelled) return
        setMed(unwrapSingle<Medication>(m))
        setHistory(unwrapList<DoseHistory>(h))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('medicationDetail.loadError', {}, { defaultValue: 'Failed to load medication.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!med)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('medicationDetail.notFound', {}, { defaultValue: 'Medication not found.' })}
      </p>
    )

  const totalDoses = history.length
  const takenDoses = history.filter((h) => h.status === 'taken').length
  const adherence = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <Link
        to="/medications"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
      >
        ← {t('medicationDetail.backLink', {}, { defaultValue: 'All medications' })}
      </Link>

      <header
        className={cm.cn(
          cm.card(),
          cm.sp('p', 6),
          cm.flex({ align: 'center', gap: 'md' }),
          'flex-wrap',
        )}
      >
        <div
          className={cm.cn(
            cm.shrink0,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.h(20),
            cm.w(20),
            'rounded-full',
          )}
          style={{ backgroundColor: PILL_COLOR[med.pill_color], color: 'white' }}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-3xl">medication</span>
        </div>
        <div className={cm.cn(cm.flex1, 'min-w-[200px]')}>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{med.name}</h1>
          {med.generic_name && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
              {med.generic_name}
            </p>
          )}
          <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2))}>
            {med.dose_amount} · {med.schedule_summary}
          </p>
        </div>
        <div
          className={cm.cn(cm.shrink0, cm.flex({ align: 'center', gap: 'sm' }), 'w-full sm:w-auto')}
        >
          {!editing && (
            <button
              type="button"
              onClick={openEdit}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'border border-outline-variant rounded-md hover:bg-surface-container',
                'min-h-[44px] flex-1 sm:flex-none',
              )}
            >
              {t('common.edit', {}, { defaultValue: 'Edit' })}
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'border border-error text-error rounded-md hover:bg-error/10 disabled:opacity-50',
              'min-h-[44px] flex-1 sm:flex-none',
            )}
          >
            {deleting
              ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
              : t('common.delete', {}, { defaultValue: 'Delete' })}
          </button>
        </div>
      </header>

      {editing && (
        <form onSubmit={saveEdit} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
              'uppercase tracking-wider',
            )}
          >
            {t('medicationDetail.editHeading', {}, { defaultValue: 'Edit medication' })}
          </h2>
          <EditField
            label={t('form.name', {}, { defaultValue: 'Name' })}
            value={draft.name}
            onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
            required
          />
          <EditField
            label={t('medicationDetail.editDose', {}, { defaultValue: 'Dose amount' })}
            value={draft.dose_amount}
            onChange={(v) => setDraft((d) => ({ ...d, dose_amount: v }))}
            required
          />
          <EditField
            label={t('nav.schedule', {}, { defaultValue: 'Schedule' })}
            value={draft.schedule_summary}
            onChange={(v) => setDraft((d) => ({ ...d, schedule_summary: v }))}
            required
          />
          <EditField
            label={t('medicationDetail.editPharmacy', {}, { defaultValue: 'Pharmacy' })}
            value={draft.pharmacy}
            onChange={(v) => setDraft((d) => ({ ...d, pharmacy: v }))}
          />
          {opError && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{opError}</p>}
          <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'end' })}>
            <button
              type="button"
              onClick={cancelEdit}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'border border-outline-variant rounded-md',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md disabled:opacity-50',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </form>
      )}

      {confirmDelete && (
        <div
          role="alertdialog"
          aria-labelledby="confirm-delete-heading"
          className={cm.cn(cm.card(), cm.sp('p', 5), 'border border-error space-y-3')}
        >
          <h2
            id="confirm-delete-heading"
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}
          >
            {t(
              'medicationDetail.confirmDeleteHeading',
              { name: med.name },
              { defaultValue: 'Delete {{name}}?' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'medicationDetail.confirmDeleteBody',
              {},
              {
                defaultValue:
                  'This removes the medication, its schedule, dose history, and any pending refill requests. This cannot be undone.',
              },
            )}
          </p>
          {opError && <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{opError}</p>}
          <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'end' })}>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'border border-outline-variant rounded-md',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={performDelete}
              disabled={deleting}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-error text-on-error rounded-md disabled:opacity-50',
              )}
            >
              {deleting
                ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                : t(
                    'medicationDetail.confirmDeleteLabel',
                    {},
                    { defaultValue: 'Delete medication' },
                  )}
            </button>
          </div>
        </div>
      )}

      {/* 4-up on desktop, 2-up on phones — the 3xl stat values cramp into
          ~80px columns at 390px otherwise. */}
      <section className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-4')}>
        <Stat
          label={t('medicationDetail.stat.adherence', {}, { defaultValue: 'Adherence' })}
          value={`${adherence}%`}
          accent
        />
        <Stat
          label={t('medicationDetail.stat.remaining', {}, { defaultValue: 'Pills left' })}
          value={`${med.count_remaining}`}
          warn={med.count_remaining < 7}
        />
        <Stat
          label={t('medicationDetail.stat.refills', {}, { defaultValue: 'Refills' })}
          value={`${med.refills_remaining}`}
        />
        <Stat
          label={t('medicationDetail.stat.taken', {}, { defaultValue: 'Doses taken' })}
          value={`${takenDoses}`}
        />
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant',
            'uppercase tracking-wider',
          )}
        >
          {t('nav.schedule', {}, { defaultValue: 'Schedule' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {med.schedule_times.map((time) => (
            <span
              key={time}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-full bg-primary-container text-on-primary-container',
                'font-mono',
              )}
            >
              {formatScheduledTime(time, fmt)}
            </span>
          ))}
        </div>
      </section>

      <section className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
        <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-2')}>
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
              'uppercase tracking-wider',
            )}
          >
            {t('medicationDetail.rxHeading', {}, { defaultValue: 'Prescription' })}
          </h2>
          <KV
            label={t('medicationDetail.rx.prescriber', {}, { defaultValue: 'Prescriber' })}
            value={med.prescriber}
          />
          <KV
            label={t('medicationDetail.rx.pharmacy', {}, { defaultValue: 'Pharmacy' })}
            value={med.pharmacy}
          />
          <KV
            label={t('medicationDetail.rx.rxNumber', {}, { defaultValue: 'Rx number' })}
            value={med.rx_number}
            mono
          />
          {med.refill_due && (
            <KV
              label={t('medicationDetail.rx.refillBy', {}, { defaultValue: 'Refill by' })}
              value={new Date(med.refill_due).toLocaleDateString()}
            />
          )}
        </div>
        {med.warnings.length > 0 && (
          <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
            <h2
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant',
                'uppercase tracking-wider',
                cm.sp('mb', 2),
              )}
            >
              {t('medicationDetail.warningsHeading', {}, { defaultValue: 'Warnings' })}
            </h2>
            <ul className={cm.cn('space-y-2')}>
              {med.warnings.map((w, i) => (
                <li key={i} className={cm.flex({ align: 'start', gap: 'sm' })}>
                  <span
                    className={cm.cn('material-symbols-outlined text-base text-warning shrink-0')}
                    aria-hidden="true"
                  >
                    warning
                  </span>
                  <p className={cm.cn(cm.textSize('sm'))}>{w}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5))}>
        <h2
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-on-surface-variant',
            'uppercase tracking-wider',
            cm.sp('mb', 3),
          )}
        >
          {t('medicationDetail.historyHeading', {}, { defaultValue: 'Recent dose history' })}
        </h2>
        {history.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('medicationDetail.historyEmpty', {}, { defaultValue: 'No doses logged yet.' })}
          </p>
        ) : (
          <ul className={cm.cn('space-y-1.5')}>
            {history.slice(0, 14).map((h) => (
              <li key={h.id} className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: STATUS_COLOR[h.status],
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <span className={cm.cn(cm.textSize('sm'))}>
                  {h.scheduled_date && h.scheduled_time
                    ? formatScheduledDateTime(h.scheduled_date, h.scheduled_time, fmt)
                    : new Date(h.scheduled_at).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                    'ml-auto',
                    'uppercase tracking-wider',
                    cm.fontWeight('medium'),
                  )}
                  style={{ color: STATUS_COLOR[h.status] }}
                >
                  {t(`medicationDetail.doseStatus.${h.status}`, {}, { defaultValue: h.status })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function EditField({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 3),
          cm.textSize('base'),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

function Stat({
  label,
  value,
  accent,
  warn,
}: {
  label: string
  value: string
  accent?: boolean
  warn?: boolean
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          'text-on-surface-variant',
          cm.fontWeight('medium'),
          'uppercase tracking-wider',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          cm.sp('mt', 1),
          accent ? cm.textPrimary : warn ? 'text-error' : '',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{label}</span>
      <span
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          value ? '' : 'text-on-surface-variant',
        )}
        style={mono ? { fontFamily: 'var(--mol-font-mono)' } : undefined}
      >
        {value || '—'}
      </span>
    </div>
  )
}
