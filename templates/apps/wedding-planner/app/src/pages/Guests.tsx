import { useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

type RsvpStatus = 'pending' | 'yes' | 'no' | 'maybe'
type Side = 'partner_a' | 'partner_b' | 'both'

interface Guest {
  id: string
  name: string
  side: Side
  group_name: string | null
  email: string | null
  phone: string | null
  rsvp_status: RsvpStatus
  meal_choice: string | null
  plus_ones: number
  notes: string | null
}

const RSVP_STATUSES: RsvpStatus[] = ['pending', 'yes', 'no', 'maybe']
const SIDES: Side[] = ['partner_a', 'partner_b', 'both']

const RSVP_CHIP_STYLES: Record<RsvpStatus, { bg: string; fg: string }> = {
  pending: { bg: 'var(--color-rsvp-pending-bg)', fg: 'var(--color-rsvp-pending)' },
  yes: { bg: 'var(--color-rsvp-yes-bg)', fg: 'var(--color-rsvp-yes)' },
  no: { bg: 'var(--color-rsvp-no-bg)', fg: 'var(--color-rsvp-no)' },
  maybe: { bg: 'var(--color-rsvp-maybe-bg)', fg: 'var(--color-rsvp-maybe)' },
}

const EMPTY_FORM = {
  name: '',
  side: 'both' as Side,
  group_name: '',
  email: '',
  rsvp_status: 'pending' as RsvpStatus,
  meal_choice: '',
  plus_ones: 0,
}

export function Guests() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'' | RsvpStatus>('')
  const [sideFilter, setSideFilter] = useState<'' | Side>('')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (sideFilter) params.set('side', sideFilter)
      if (query.trim()) params.set('q', query.trim())
      const res = await http.get(`/api/guests${params.size > 0 ? `?${params}` : ''}`)
      setGuests((res.data as Guest[]) ?? [])
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load guests')
    } finally {
      setLoading(false)
    }
  }, [http, statusFilter, sideFilter, query])

  useEffect(() => {
    load()
  }, [load])

  async function addGuest(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await http.post('/api/guests', {
        name: form.name.trim(),
        side: form.side,
        group_name: form.group_name.trim() || null,
        email: form.email.trim() || null,
        rsvp_status: form.rsvp_status,
        meal_choice: form.meal_choice.trim() || null,
        plus_ones: Number(form.plus_ones) || 0,
      })
      void track({ name: 'guest.created', properties: { side: form.side } })
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not add the guest')
    } finally {
      setSaving(false)
    }
  }

  async function updateGuest(id: string, patch: Partial<Guest>) {
    // Optimistic update — the row reflects the change immediately.
    setGuests((rows) => rows.map((g) => (g.id === id ? { ...g, ...patch } : g)))
    try {
      await http.put(`/api/guests/${id}`, patch)
      if (patch.rsvp_status) {
        void track({
          name: 'guest.rsvp_updated',
          properties: { guest_id: id, status: patch.rsvp_status },
        })
      }
    } catch (e) {
      setError((e as Error).message ?? 'Could not save the change')
      await load()
    }
  }

  async function removeGuest(id: string) {
    try {
      await http.delete(`/api/guests/${id}`)
      void track({ name: 'guest.deleted', properties: { guest_id: id } })
      await load()
    } catch (e) {
      setError((e as Error).message ?? 'Could not remove the guest')
    }
  }

  const inputCls = cm.cn(
    'w-full rounded-xl border border-outline-variant/60 bg-input-background px-3 py-2',
    'focus:outline-none focus:ring-2 focus:ring-primary/40',
  )

  return (
    <div
      className={cm.cn(cm.sp('p', 6), cm.sp('px', 8), 'max-w-6xl w-full mx-auto')}
      data-mol-id="page-guests"
    >
      <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'flex-wrap gap-4')}>
        <div>
          <p
            className={cm.cn('text-xs font-black uppercase tracking-widest')}
            style={{ color: 'var(--color-accent)' }}
          >
            {t('guests.eyebrow', {}, { defaultValue: 'Guest list' })}
          </p>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t('guests.title', {}, { defaultValue: 'Guest list & attendance' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'mt-2 text-on-surface-variant max-w-xl')}>
            {t(
              'guests.subtitle',
              {},
              {
                defaultValue:
                  'Everyone you’re inviting, their side, their group, and where their RSVP stands.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          data-mol-id="guests-toggle-form"
          className={cm.cn(
            'px-4 py-2.5 rounded-xl font-bold text-white shadow-md shadow-primary/30',
          )}
          style={{ background: 'var(--color-primary)' }}
        >
          {showForm
            ? t('guests.hideForm', {}, { defaultValue: 'Close' })
            : t('guests.addGuest', {}, { defaultValue: 'Add guest' })}
        </button>
      </header>

      {error ? (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            'mt-4 rounded-xl bg-error-light text-error font-bold text-sm',
          )}
          data-mol-id="guests-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {showForm ? (
        <form
          onSubmit={addGuest}
          data-mol-id="guests-add-form"
          className={cm.cn(
            cm.sp('p', 6),
            'mt-6 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
            'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
          )}
        >
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('guests.form.name', {}, { defaultValue: 'Name' })}
            </span>
            <input
              type="text"
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-mol-id="guests-form-name"
              className={inputCls}
            />
          </label>
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('guests.form.side', {}, { defaultValue: 'Side' })}
            </span>
            <select
              value={form.side}
              onChange={(e) => setForm({ ...form, side: e.target.value as Side })}
              data-mol-id="guests-form-side"
              className={inputCls}
            >
              {SIDES.map((side) => (
                <option key={side} value={side}>
                  {t(`guests.side.${side}`, {}, { defaultValue: sideLabel(side) })}
                </option>
              ))}
            </select>
          </label>
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('guests.form.group', {}, { defaultValue: 'Group (optional)' })}
            </span>
            <input
              type="text"
              maxLength={120}
              value={form.group_name}
              onChange={(e) => setForm({ ...form, group_name: e.target.value })}
              data-mol-id="guests-form-group"
              className={inputCls}
            />
          </label>
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('guests.form.email', {}, { defaultValue: 'Email (optional)' })}
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-mol-id="guests-form-email"
              className={inputCls}
            />
          </label>
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('guests.form.rsvp', {}, { defaultValue: 'RSVP status' })}
            </span>
            <select
              value={form.rsvp_status}
              onChange={(e) => setForm({ ...form, rsvp_status: e.target.value as RsvpStatus })}
              data-mol-id="guests-form-status"
              className={inputCls}
            >
              {RSVP_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`rsvp.status.${status}`, {}, { defaultValue: status })}
                </option>
              ))}
            </select>
          </label>
          <label className={cm.cn(cm.stack(1))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('guests.form.plusOnes', {}, { defaultValue: 'Plus-ones' })}
            </span>
            <input
              type="number"
              min={0}
              max={10}
              value={form.plus_ones}
              onChange={(e) => setForm({ ...form, plus_ones: Number(e.target.value) })}
              data-mol-id="guests-form-plus-ones"
              className={inputCls}
            />
          </label>
          <div className={cm.cn('sm:col-span-2 lg:col-span-3')}>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              data-mol-id="guests-form-submit"
              className={cm.cn('px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-50')}
              style={{ background: 'var(--color-primary)' }}
            >
              {saving
                ? t('guests.form.saving', {}, { defaultValue: 'Saving…' })
                : t('guests.form.submit', {}, { defaultValue: 'Add to list' })}
            </button>
          </div>
        </form>
      ) : null}

      {/* Filters */}
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), 'mt-6')}
        data-mol-id="guests-filters"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('guests.searchPlaceholder', {}, { defaultValue: 'Search by name…' })}
          aria-label={t('guests.searchAria', {}, { defaultValue: 'Search guests by name' })}
          data-mol-id="guests-search"
          className={cm.cn(inputCls, 'max-w-xs')}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | RsvpStatus)}
          aria-label={t('guests.filterStatusAria', {}, { defaultValue: 'Filter by RSVP status' })}
          data-mol-id="guests-filter-status"
          className={cm.cn(inputCls, 'max-w-[10rem]')}
        >
          <option value="">
            {t('guests.filterAllStatuses', {}, { defaultValue: 'All statuses' })}
          </option>
          {RSVP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`rsvp.status.${status}`, {}, { defaultValue: status })}
            </option>
          ))}
        </select>
        <select
          value={sideFilter}
          onChange={(e) => setSideFilter(e.target.value as '' | Side)}
          aria-label={t('guests.filterSideAria', {}, { defaultValue: 'Filter by side' })}
          data-mol-id="guests-filter-side"
          className={cm.cn(inputCls, 'max-w-[10rem]')}
        >
          <option value="">{t('guests.filterAllSides', {}, { defaultValue: 'All sides' })}</option>
          {SIDES.map((side) => (
            <option key={side} value={side}>
              {t(`guests.side.${side}`, {}, { defaultValue: sideLabel(side) })}
            </option>
          ))}
        </select>
        <span
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant ml-auto font-bold')}
          data-mol-id="guests-count"
        >
          {t(
            'guests.count',
            { count: guests.length },
            { defaultValue: guests.length === 1 ? '1 guest' : '{{count}} guests' },
          )}
        </span>
      </div>

      {/* Table */}
      <div
        className={cm.cn(
          'mt-4 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm overflow-x-auto',
        )}
        data-mol-id="guests-table"
      >
        {loading ? (
          <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : guests.length === 0 ? (
          <p className={cm.cn(cm.sp('p', 6), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'guests.empty',
              {},
              { defaultValue: 'No guests match — add your first guest to start the list.' },
            )}
          </p>
        ) : (
          <table className={cm.cn('w-full text-left', cm.textSize('sm'))}>
            <thead>
              <tr
                className={cm.cn(
                  'text-xs font-black uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/40',
                )}
              >
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('guests.col.name', {}, { defaultValue: 'Name' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('guests.col.side', {}, { defaultValue: 'Side' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('guests.col.group', {}, { defaultValue: 'Group' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('guests.col.contact', {}, { defaultValue: 'Contact' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('guests.col.rsvp', {}, { defaultValue: 'RSVP' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('guests.col.meal', {}, { defaultValue: 'Meal' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  {t('guests.col.plusOnes', {}, { defaultValue: '+1s' })}
                </th>
                {/* `relative` pins the sr-only span's containing block to this
                    th — an abs-positioned sr-only child of a static ancestor
                    escapes every overflow clip up to the viewport and widens
                    the document's horizontal scroll area on mobile. */}
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'relative')}>
                  <span className="sr-only">
                    {t('common.actions', {}, { defaultValue: 'Actions' })}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr
                  key={guest.id}
                  data-mol-id={`guest-row-${guest.id}`}
                  className={cm.cn('border-b border-outline-variant/20 last:border-0')}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-bold')}>
                    {guest.name}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {t(`guests.side.${guest.side}`, {}, { defaultValue: sideLabel(guest.side) })}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {guest.group_name ?? '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {guest.email ?? guest.phone ?? '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <select
                      value={guest.rsvp_status}
                      onChange={(e) =>
                        updateGuest(guest.id, { rsvp_status: e.target.value as RsvpStatus })
                      }
                      aria-label={t(
                        'guests.setRsvpAria',
                        { name: guest.name },
                        { defaultValue: 'RSVP status for {{name}}' },
                      )}
                      data-mol-id={`guest-status-${guest.id}`}
                      className={cm.cn(
                        'px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide border-0 cursor-pointer',
                      )}
                      style={{
                        background: RSVP_CHIP_STYLES[guest.rsvp_status].bg,
                        color: RSVP_CHIP_STYLES[guest.rsvp_status].fg,
                      }}
                    >
                      {RSVP_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {t(`rsvp.status.${status}`, {}, { defaultValue: status })}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {guest.meal_choice ?? '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'tabular-nums')}>
                    {guest.rsvp_status === 'no' ? '—' : guest.plus_ones}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <ConfirmButton
                      label={
                        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                          delete
                        </span>
                      }
                      confirmLabel={t(
                        'guests.deleteConfirm',
                        { name: guest.name },
                        { defaultValue: `Remove ${guest.name} from the list?` },
                      )}
                      aria-label={t(
                        'guests.removeAria',
                        { name: guest.name },
                        { defaultValue: 'Remove {{name}}' },
                      )}
                      onConfirm={() => removeGuest(guest.id)}
                      data-mol-id={`guest-remove-${guest.id}`}
                      disarmSeconds={5}
                      size="sm"
                      color="error"
                      variant="ghost"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function sideLabel(side: Side): string {
  if (side === 'partner_a') return 'Partner A'
  if (side === 'partner_b') return 'Partner B'
  return 'Both'
}

export default Guests
