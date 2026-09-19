import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatCents } from '../lib/money.js'

interface GroupListRow {
  id: string
  name: string
  members: { id: string; name: string; is_self: boolean }[]
}

type SplitMethod = 'equal' | 'exact' | 'shares'

const CATEGORIES = [
  { value: 'groceries', label: 'Groceries', icon: 'shopping_cart' },
  { value: 'meals', label: 'Meals', icon: 'restaurant' },
  { value: 'lodging', label: 'Lodging', icon: 'hotel' },
  { value: 'rent', label: 'Rent', icon: 'home' },
  { value: 'utilities', label: 'Utilities', icon: 'wifi' },
  { value: 'transport', label: 'Transport', icon: 'directions_car' },
  { value: 'activities', label: 'Activities', icon: 'downhill_skiing' },
  { value: 'other', label: 'Other', icon: 'receipt_long' },
] as const

const SPLIT_METHODS: { value: SplitMethod; label: string; hint: string }[] = [
  { value: 'equal', label: 'Equally', hint: 'Split the total evenly across participants' },
  {
    value: 'exact',
    label: 'Exact amounts',
    hint: 'Enter each share by hand — must sum to the total',
  },
  { value: 'shares', label: 'Shares', hint: 'Weight each participant (e.g. 2 for a couple)' },
]

/** Parse a user-typed decimal dollars string into integer cents (or null). */
function dollarsToCents(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed.length === 0) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

export function NewExpense() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [groups, setGroups] = useState<GroupListRow[]>([])
  const [groupId, setGroupId] = useState('')
  const [payerId, setPayerId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState<string>('groceries')
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal')
  const [participants, setParticipants] = useState<Set<string>>(new Set())
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({})
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<GroupListRow[]>('/api/groups')
      .then((response) => {
        if (cancelled) return
        const rows = Array.isArray(response?.data) ? (response.data as GroupListRow[]) : []
        setGroups(rows)
        const wanted = searchParams.get('group')
        const initial = rows.find((g) => g.id === wanted) ?? rows[0]
        if (initial) {
          setGroupId(initial.id)
          setPayerId(initial.members.find((m) => m.is_self)?.id ?? initial.members[0]?.id ?? '')
          setParticipants(new Set(initial.members.map((m) => m.id)))
        }
      })
      .catch(() => {
        if (cancelled) return
      })
    return () => {
      cancelled = true
    }
  }, [http, searchParams])

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId])
  const members = group?.members ?? []

  function handleGroupChange(nextGroupId: string): void {
    setGroupId(nextGroupId)
    const next = groups.find((g) => g.id === nextGroupId)
    const nextMembers = next?.members ?? []
    setPayerId(nextMembers.find((m) => m.is_self)?.id ?? nextMembers[0]?.id ?? '')
    setParticipants(new Set(nextMembers.map((m) => m.id)))
    setExactAmounts({})
    setWeights({})
  }

  function toggleParticipant(memberId: string): void {
    setParticipants((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  const amountCents = dollarsToCents(amount)
  const activeIds = members.filter((m) => participants.has(m.id)).map((m) => m.id)
  const exactSumCents = activeIds.reduce(
    (sum, id) => sum + (dollarsToCents(exactAmounts[id] ?? '') ?? 0),
    0,
  )
  const weightSum = activeIds.reduce((sum, id) => {
    const w = Number(weights[id] ?? '1')
    return sum + (Number.isFinite(w) && w >= 1 ? Math.floor(w) : 1)
  }, 0)
  const perPersonCents =
    activeIds.length > 0 && amountCents !== null && amountCents > 0
      ? Math.floor(amountCents / activeIds.length)
      : 0

  const exactMismatch =
    splitMethod === 'exact' && amountCents !== null && activeIds.length > 0
      ? exactSumCents !== amountCents
      : false

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setError(null)
    if (!groupId || !payerId) {
      setError(
        t(
          'newExpense.noGroup',
          {},
          { defaultValue: 'Create a group with at least one member first.' },
        ),
      )
      return
    }
    if (amountCents === null || amountCents <= 0) {
      setError(
        t('newExpense.badAmount', {}, { defaultValue: 'Enter an amount greater than zero.' }),
      )
      return
    }
    if (activeIds.length === 0) {
      setError(
        t(
          'newExpense.noParticipants',
          {},
          { defaultValue: 'Pick at least one member to split across.' },
        ),
      )
      return
    }
    if (exactMismatch) {
      setError(
        t(
          'newExpense.exactMismatch',
          { given: formatCents(exactSumCents), wanted: formatCents(amountCents ?? 0) },
          { defaultValue: 'Exact shares sum to {{given}} but the expense is {{wanted}}.' },
        ),
      )
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        group_id: groupId,
        payer_member_id: payerId,
        amount_cents: amountCents,
        description,
        category,
        date,
        split_method: splitMethod,
      }
      if (splitMethod === 'equal') {
        body.participants = activeIds
      } else {
        body.shares = activeIds.map((id) =>
          splitMethod === 'exact'
            ? { member_id: id, amount_cents: dollarsToCents(exactAmounts[id] ?? '') ?? 0 }
            : {
                member_id: id,
                weight: Math.max(1, Math.floor(Number(weights[id] ?? '1') || 1)),
              },
        )
      }
      await http.post('/api/expenses', body)
      navigate(`/groups/${groupId}`)
    } catch (err) {
      console.warn('Expense save failed', err)
      setError(
        t(
          'newExpense.saveFailed',
          {},
          { defaultValue: 'Could not save the expense. Please check your inputs and try again.' },
        ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
  )
  const labelClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    'uppercase tracking-widest text-on-surface-variant',
  )

  return (
    <div data-mol-id="page-new-expense" className={cm.stack(8)}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('newExpense.eyebrow', {}, { defaultValue: 'One receipt, everyone’s share' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('newExpense.title', {}, { defaultValue: 'Add expense' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant max-w-2xl')}
        >
          {t(
            'newExpense.subtitle',
            {},
            {
              defaultValue:
                'Enter what was paid and how it splits — shares are computed to the cent, and every group always balances to zero.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div
          data-mol-id="new-expense-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-error-container/40 text-on-error-container',
          )}
        >
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        data-mol-id="form-new-expense"
        className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}
      >
        <section className={cm.cn('lg:col-span-2 space-y-6')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-5',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label htmlFor="expense-group" className={labelClass}>
                  {t('newExpense.group', {}, { defaultValue: 'Group' })}
                </label>
                <select
                  id="expense-group"
                  value={groupId}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  required
                  className={inputClass}
                >
                  {groups.length === 0 ? <option value="">No groups yet</option> : null}
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label htmlFor="expense-payer" className={labelClass}>
                  {t('newExpense.payer', {}, { defaultValue: 'Paid by' })}
                </label>
                <select
                  id="expense-payer"
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  required
                  className={inputClass}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.is_self ? t('newExpense.youOption', {}, { defaultValue: 'You' }) : m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label htmlFor="expense-amount" className={labelClass}>
                  {t('newExpense.amount', {}, { defaultValue: 'Amount (USD)' })}
                </label>
                <div className={cm.cn('relative')}>
                  <span
                    className={cm.cn(
                      'absolute left-4 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant pointer-events-none',
                    )}
                  >
                    $
                  </span>
                  <input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className={cm.cn(inputClass, 'pl-8 tabular-nums')}
                  />
                </div>
              </div>

              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <label htmlFor="expense-date" className={labelClass}>
                  {t('form.date', {}, { defaultValue: 'Date' })}
                </label>
                <input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className={cm.cn(inputClass, 'tabular-nums')}
                />
              </div>
            </div>

            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <label htmlFor="expense-description" className={labelClass}>
                {t('newExpense.description', {}, { defaultValue: 'Description' })}
              </label>
              <input
                id="expense-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={200}
                placeholder={t(
                  'newExpense.descriptionPlaceholder',
                  {},
                  { defaultValue: 'Groceries and firewood' },
                )}
                className={inputClass}
              />
            </div>

            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span className={labelClass}>
                {t('form.category', {}, { defaultValue: 'Category' })}
              </span>
              <ul className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
                {CATEGORIES.map((cat) => {
                  const active = category === cat.value
                  return (
                    <li key={cat.value}>
                      <button
                        type="button"
                        data-mol-id={`btn-category-${cat.value}`}
                        onClick={() => setCategory(cat.value)}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'rounded-full uppercase tracking-widest transition-colors',
                          active
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-base')}
                          aria-hidden="true"
                        >
                          {cat.icon}
                        </span>
                        {t(`newExpense.category.${cat.value}`, {}, { defaultValue: cat.label })}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          <div
            data-mol-id="split-section"
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-5',
            )}
          >
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span className={labelClass}>
                {t('newExpense.splitMethod', {}, { defaultValue: 'How is it split?' })}
              </span>
              <ul className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
                {SPLIT_METHODS.map((method) => {
                  const active = splitMethod === method.value
                  return (
                    <li key={method.value}>
                      <button
                        type="button"
                        data-mol-id={`btn-split-${method.value}`}
                        onClick={() => setSplitMethod(method.value)}
                        aria-pressed={active}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'rounded-full uppercase tracking-widest transition-colors',
                          active
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
                        )}
                      >
                        {t(`newExpense.split.${method.value}`, {}, { defaultValue: method.label })}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  `newExpense.splitHint.${splitMethod}`,
                  {},
                  {
                    defaultValue: SPLIT_METHODS.find((m) => m.value === splitMethod)?.hint,
                  },
                )}
              </p>
            </div>

            <ul className={cm.cn(cm.stack(2))}>
              {members.map((member) => {
                const included = participants.has(member.id)
                return (
                  <li
                    key={member.id}
                    data-mol-id={`split-row-${member.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-xl bg-surface-container-low',
                      included ? '' : 'opacity-50',
                    )}
                  >
                    <label
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        cm.flex1,
                        'min-w-0 cursor-pointer',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() => toggleParticipant(member.id)}
                        data-mol-id={`chk-participant-${member.id}`}
                        className="h-4 w-4 accent-primary"
                      />
                      {member.is_self
                        ? t('newExpense.youOption', {}, { defaultValue: 'You' })
                        : member.name}
                    </label>
                    {included && splitMethod === 'equal' ? (
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          'text-on-surface-variant tabular-nums shrink-0',
                        )}
                      >
                        ≈ {formatCents(perPersonCents)}
                      </span>
                    ) : null}
                    {included && splitMethod === 'exact' ? (
                      <span className={cm.cn('relative w-32 shrink-0')}>
                        <span
                          className={cm.cn(
                            'absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant pointer-events-none',
                          )}
                        >
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={exactAmounts[member.id] ?? ''}
                          onChange={(e) =>
                            setExactAmounts((prev) => ({
                              ...prev,
                              [member.id]: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          aria-label={t(
                            'newExpense.exactShareFor',
                            { name: member.name },
                            { defaultValue: 'Exact share for {{name}}' },
                          )}
                          className={cm.cn(
                            cm.w('full'),
                            cm.sp('pl', 6),
                            cm.sp('pr', 3),
                            cm.sp('py', 2),
                            cm.textSize('sm'),
                            'rounded-lg bg-surface border border-outline-variant focus:border-primary outline-none tabular-nums',
                          )}
                        />
                      </span>
                    ) : null}
                    {included && splitMethod === 'shares' ? (
                      <span className={cm.cn('relative w-24 shrink-0')}>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={weights[member.id] ?? ''}
                          onChange={(e) =>
                            setWeights((prev) => ({ ...prev, [member.id]: e.target.value }))
                          }
                          placeholder="1"
                          aria-label={t(
                            'newExpense.weightFor',
                            { name: member.name },
                            { defaultValue: 'Share weight for {{name}}' },
                          )}
                          className={cm.cn(
                            cm.w('full'),
                            cm.sp('px', 3),
                            cm.sp('py', 2),
                            cm.textSize('sm'),
                            'rounded-lg bg-surface border border-outline-variant focus:border-primary outline-none tabular-nums text-center',
                          )}
                        />
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>

            {splitMethod === 'exact' && amountCents !== null && amountCents > 0 ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  exactMismatch ? 'font-semibold text-error' : 'text-on-surface-variant',
                )}
              >
                {exactMismatch
                  ? t(
                      'newExpense.exactMismatchShort',
                      { given: formatCents(exactSumCents), wanted: formatCents(amountCents) },
                      { defaultValue: 'Shares sum to {{given}} of {{wanted}} — adjust them.' },
                    )
                  : t(
                      'newExpense.exactMatches',
                      {},
                      { defaultValue: 'Shares match the total — exact.' },
                    )}
              </p>
            ) : null}
            {splitMethod === 'shares' &&
            weightSum > 0 &&
            amountCents !== null &&
            amountCents > 0 ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'newExpense.weightTotal',
                  { total: weightSum },
                  { defaultValue: '{{total}} total shares — remainders go to the largest share.' },
                )}
              </p>
            ) : null}
          </div>
        </section>

        <aside className={cm.cn('space-y-4')}>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl bg-surface border border-outline-variant/40 space-y-3',
            )}
          >
            <h2 className={labelClass}>
              {t('newExpense.summary', {}, { defaultValue: 'Summary' })}
            </h2>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('newExpense.totalLabel', {}, { defaultValue: 'Expense total' })}
              </span>
              <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tabular-nums')}>
                {formatCents(amountCents ?? 0)}
              </span>
            </div>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('newExpense.splitAcross', {}, { defaultValue: 'Split across' })}
              </span>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t(
                  'newExpense.peopleCount',
                  { count: activeIds.length },
                  { defaultValue: '{{count}} people' },
                )}
              </span>
            </div>
            {splitMethod === 'equal' && activeIds.length > 0 ? (
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('newExpense.perPerson', {}, { defaultValue: 'Per person' })}
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'tabular-nums')}>
                  ≈ {formatCents(perPersonCents)}
                </span>
              </div>
            ) : null}
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'rounded-xl bg-primary-container/50 text-on-primary-container',
            )}
          >
            {t(
              'newExpense.hint',
              {},
              {
                defaultValue:
                  'Remainder cents are distributed deterministically so shares always sum exactly to the total.',
              },
            )}
          </div>
        </aside>

        <div
          className={cm.cn(
            'lg:col-span-3',
            cm.flex({ align: 'center', justify: 'end', gap: 'sm', wrap: 'wrap' }),
          )}
        >
          <button
            type="button"
            data-mol-id="btn-cancel-expense"
            onClick={() => navigate(-1)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="submit"
            data-mol-id="btn-submit-expense"
            disabled={submitting}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-full text-white shadow-md shadow-primary/20 transition-all disabled:opacity-60 inline-flex items-center gap-2',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              save
            </span>
            {submitting
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('newExpense.save', {}, { defaultValue: 'Save expense' })}
          </button>
        </div>
      </form>
    </div>
  )
}
