import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatCents } from '../lib/money.js'

interface MemberBalance {
  member_id: string
  name: string
  is_self: boolean
  paid_cents: number
  owed_cents: number
  sent_cents: number
  received_cents: number
  net_cents: number
}

interface Transfer {
  from_member_id: string
  to_member_id: string
  amount_cents: number
}

interface GroupDetailData {
  id: string
  name: string
  description: string | null
  currency: string
  members: { id: string; name: string; email: string | null; is_self: boolean }[]
  balances: MemberBalance[]
  suggestions: Transfer[]
}

interface ExpenseRow {
  id: string
  payer_member_id: string
  payer_name: string
  amount_cents: number
  description: string
  category: string
  date: string | null
  split_method: string
  shares: { member_id: string; amount_cents: number }[]
}

interface SettlementRow {
  id: string
  from_member_id: string
  from_name: string
  to_member_id: string
  to_name: string
  amount_cents: number
  method: string
  date: string | null
  note: string | null
}

const SPLIT_LABELS: Record<string, string> = {
  equal: 'Equal split',
  exact: 'Exact amounts',
  shares: 'Weighted shares',
}

const CATEGORY_ICONS: Record<string, string> = {
  groceries: 'shopping_cart',
  meals: 'restaurant',
  lodging: 'hotel',
  rent: 'home',
  utilities: 'wifi',
  transport: 'directions_car',
  activities: 'downhill_skiing',
  other: 'receipt_long',
}

export function GroupDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [group, setGroup] = useState<GroupDetailData | null>(null)
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [settlements, setSettlements] = useState<SettlementRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [memberName, setMemberName] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  /** Two-step delete: the row id awaiting its confirm click. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    try {
      const [groupRes, expensesRes, settlementsRes] = await Promise.all([
        http.get<GroupDetailData>(`/api/groups/${id}`),
        http.get<ExpenseRow[]>(`/api/expenses?group_id=${id}`),
        http.get<SettlementRow[]>(`/api/settlements?group_id=${id}`),
      ])
      setGroup((groupRes?.data as GroupDetailData) ?? null)
      setExpenses(Array.isArray(expensesRes?.data) ? (expensesRes.data as ExpenseRow[]) : [])
      setSettlements(
        Array.isArray(settlementsRes?.data) ? (settlementsRes.data as SettlementRow[]) : [],
      )
      setNotFound(false)
    } catch (err) {
      console.warn('Group detail load failed', err)
      setNotFound(true)
    } finally {
      setLoaded(true)
    }
  }, [http, id])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleAddMember(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!id || memberName.trim().length === 0) return
    setAddingMember(true)
    setError(null)
    try {
      await http.post(`/api/groups/${id}/members`, { name: memberName.trim() })
      track({ name: 'member.added', properties: { group_id: id, name: memberName.trim() } })
      setMemberName('')
      await reload()
    } catch (err) {
      console.warn('Add member failed', err)
      setError(t('group.addMemberFailed', {}, { defaultValue: 'Could not add that member.' }))
    } finally {
      setAddingMember(false)
    }
  }

  async function handleRecordSettlement(transfer: Transfer): Promise<void> {
    if (!id) return
    setRecordingId(`${transfer.from_member_id}->${transfer.to_member_id}`)
    setError(null)
    try {
      await http.post('/api/settlements', {
        group_id: id,
        from_member_id: transfer.from_member_id,
        to_member_id: transfer.to_member_id,
        amount_cents: transfer.amount_cents,
        method: 'cash',
      })
      track({
        name: 'settlement.recorded',
        properties: {
          group_id: id,
          from_member_id: transfer.from_member_id,
          to_member_id: transfer.to_member_id,
          amount_cents: transfer.amount_cents,
        },
      })
      await reload()
    } catch (err) {
      console.warn('Settlement record failed', err)
      setError(t('group.settleFailed', {}, { defaultValue: 'Could not record that settlement.' }))
    } finally {
      setRecordingId(null)
    }
  }

  async function handleDeleteExpense(expenseId: string): Promise<void> {
    setError(null)
    setDeletingId(expenseId)
    try {
      await http.delete(`/api/expenses/${expenseId}`)
      track({ name: 'expense.deleted', properties: { expense_id: expenseId, group_id: id } })
      setConfirmDeleteId(null)
      await reload()
    } catch (err) {
      console.warn('Expense delete failed', err)
      setError(t('group.deleteFailed', {}, { defaultValue: 'Could not delete that expense.' }))
    } finally {
      setDeletingId(null)
    }
  }

  if (loaded && notFound) {
    return (
      <div
        data-mol-id="group-not-found"
        className={cm.cn(
          cm.sp('p', 10),
          cm.textCenter,
          'rounded-2xl bg-surface border border-dashed border-outline-variant',
        )}
      >
        <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('group.notFoundTitle', {}, { defaultValue: 'Group not found' })}
        </p>
        <Link
          to="/groups"
          data-mol-id="btn-back-to-groups"
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 3),
            cm.fontWeight('semibold'),
            'text-primary-dark hover:underline inline-block',
          )}
        >
          {t('group.backToGroups', {}, { defaultValue: 'Back to all groups' })}
        </Link>
      </div>
    )
  }

  if (!group) {
    return (
      <div
        data-mol-id="group-loading"
        className={cm.cn(
          cm.sp('p', 10),
          cm.textCenter,
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        {t('common.loading', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  const memberNameById = new Map(group.members.map((m) => [m.id, m.name]))
  const settled = group.suggestions.length === 0

  return (
    <div data-mol-id="page-group-detail" className={cm.stack(8)}>
      <header className={cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <Link
            to="/groups"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('group.allGroups', {}, { defaultValue: '← Groups' })}
          </Link>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}
          >
            {group.name}
          </h1>
          {group.description ? (
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {group.description}
            </p>
          ) : null}
        </div>
        <Link
          to={`/expenses/new?group=${group.id}`}
          data-mol-id="btn-group-add-expense"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full text-white inline-flex items-center gap-2 transition-colors shadow-sm',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {t('group.addExpense', {}, { defaultValue: 'Add expense' })}
        </Link>
      </header>

      {error ? (
        <div
          data-mol-id="group-error"
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

      <div className={cm.cn('grid grid-cols-1 lg:grid-cols-2 gap-6')}>
        <section
          data-mol-id="group-balances"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40',
            cm.stack(4),
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('group.balances', {}, { defaultValue: 'Member balances' })}
          </h2>
          <ul className={cm.cn(cm.stack(2))}>
            {group.balances.map((balance) => (
              <li
                key={balance.member_id}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface-container-low',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-8 w-8 shrink-0 rounded-full text-[11px] font-bold uppercase',
                    balance.is_self
                      ? 'bg-primary text-on-primary'
                      : 'bg-secondary-container text-on-secondary-container',
                  )}
                  aria-hidden="true"
                >
                  {balance.name.slice(0, 2)}
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {/* The API names the self member exactly "You" (see
                        groups.ts POST / and _seed.ts) — never append a
                        redundant "(you)" suffix to it. */}
                    {balance.is_self
                      ? t('group.youLabel', {}, { defaultValue: 'You' })
                      : balance.name}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'group.paidVsOwed',
                      {
                        paid: formatCents(balance.paid_cents),
                        owed: formatCents(balance.owed_cents),
                      },
                      { defaultValue: 'Paid {{paid}} · owes share {{owed}}' },
                    )}
                  </span>
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'tabular-nums shrink-0',
                    balance.net_cents < 0
                      ? 'text-error'
                      : balance.net_cents > 0
                        ? 'text-primary'
                        : 'text-on-surface-variant',
                  )}
                >
                  {balance.net_cents === 0
                    ? t('group.settled', {}, { defaultValue: 'settled' })
                    : (balance.net_cents > 0
                        ? t('group.getsBack', {}, { defaultValue: 'gets back' })
                        : t('group.owes', {}, { defaultValue: 'owes' })) +
                      ' ' +
                      formatCents(Math.abs(balance.net_cents))}
                </span>
              </li>
            ))}
          </ul>

          <form
            onSubmit={handleAddMember}
            data-mol-id="form-add-member"
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('pt', 2))}
          >
            <input
              id="new-member-name"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              maxLength={80}
              placeholder={t(
                'group.newMemberPlaceholder',
                {},
                { defaultValue: 'Add someone by name…' },
              )}
              className={cm.cn(
                cm.flex1,
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none min-w-0',
              )}
            />
            <button
              type="submit"
              data-mol-id="btn-add-member"
              disabled={addingMember || memberName.trim().length === 0}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors disabled:opacity-60 inline-flex items-center gap-1 shrink-0',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                person_add
              </span>
              {t('group.addMember', {}, { defaultValue: 'Add' })}
            </button>
          </form>
        </section>

        <section
          data-mol-id="group-settle-up"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40',
            cm.stack(4),
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('group.settleUp', {}, { defaultValue: 'Settle up' })}
          </h2>
          {settled ? (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('p', 5),
                'rounded-xl bg-primary-container/40 text-on-surface',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-2xl text-primary')}
                aria-hidden="true"
              >
                task_alt
              </span>
              <div>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                  {t('group.allSquare', {}, { defaultValue: 'Everyone is square' })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'group.allSquareBody',
                    {},
                    { defaultValue: 'No outstanding balances in this group.' },
                  )}
                </p>
              </div>
            </div>
          ) : (
            <ul className={cm.cn(cm.stack(2))}>
              {group.suggestions.map((transfer) => {
                const key = `${transfer.from_member_id}->${transfer.to_member_id}`
                return (
                  <li
                    key={key}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-xl bg-surface-container-low',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'), cm.flex1, 'min-w-0')}>
                      <strong className={cm.fontWeight('semibold')}>
                        {memberNameById.get(transfer.from_member_id) ?? 'Member'}
                      </strong>{' '}
                      {t('group.pays', {}, { defaultValue: 'pays' })}{' '}
                      <strong className={cm.fontWeight('semibold')}>
                        {memberNameById.get(transfer.to_member_id) ?? 'Member'}
                      </strong>{' '}
                      <span className="tabular-nums font-bold">
                        {formatCents(transfer.amount_cents)}
                      </span>
                    </span>
                    <button
                      type="button"
                      data-mol-id={`btn-record-settle-${transfer.from_member_id}`}
                      disabled={recordingId === key}
                      onClick={() => void handleRecordSettlement(transfer)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'rounded-full text-white transition-colors disabled:opacity-60 shrink-0',
                      )}
                      style={{
                        background:
                          'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                      }}
                    >
                      {recordingId === key
                        ? t('common.recordingEllipsis', {}, { defaultValue: 'Recording…' })
                        : t('group.recordPayment', {}, { defaultValue: 'Record payment' })}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'group.settleHint',
              {},
              {
                defaultValue:
                  'The fewest transfers that zero this group out. Recording one marks the money as moved — no payment is sent.',
              },
            )}
          </p>

          {settlements.length > 0 ? (
            <div className={cm.stack(2)}>
              <h3
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('group.settlementHistory', {}, { defaultValue: 'Recorded payments' })}
              </h3>
              <ul className={cm.cn(cm.stack(1))}>
                {settlements.map((settlement) => (
                  <li
                    key={settlement.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-sm shrink-0')}
                      aria-hidden="true"
                    >
                      handshake
                    </span>
                    <span className={cm.flex1}>
                      {settlement.from_name} → {settlement.to_name}
                      {settlement.note ? ` · ${settlement.note}` : ''}
                    </span>
                    <span className="tabular-nums font-semibold text-on-surface">
                      {formatCents(settlement.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <section data-mol-id="group-expenses" className={cm.stack(4)}>
        <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('group.expenses', {}, { defaultValue: 'Expenses' })}
          </h2>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'group.expenseCount',
              { count: expenses.length },
              { defaultValue: '{{count}} expenses' },
            )}
          </span>
        </header>
        <div
          className={cm.cn(
            'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden',
          )}
        >
          <ul className={cm.cn('divide-y divide-outline-variant/40')}>
            {expenses.map((expense) => (
              <li
                key={expense.id}
                data-mol-id={`expense-row-${expense.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'hover:bg-surface-container-low transition-colors',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-9 w-9 shrink-0 rounded-lg bg-primary-container text-on-primary-container',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>
                    {CATEGORY_ICONS[expense.category] ?? 'receipt_long'}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface truncate',
                    )}
                  >
                    {expense.description}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'group.paidBy',
                      { payer: expense.payer_name },
                      { defaultValue: '{{payer}} paid' },
                    )}{' '}
                    · {SPLIT_LABELS[expense.split_method] ?? expense.split_method}
                    {expense.date ? ` · ${expense.date.slice(0, 10)}` : ''}
                  </span>
                </div>
                <span
                  className={cm.cn(
                    'text-base font-bold tabular-nums text-on-surface tracking-tight shrink-0',
                  )}
                >
                  {formatCents(expense.amount_cents)}
                </span>
                {confirmDeleteId === expense.id ? (
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'text-on-surface-variant whitespace-nowrap',
                      )}
                    >
                      {t('group.deleteConfirmLabel', {}, { defaultValue: 'Delete?' })}
                    </span>
                    <button
                      type="button"
                      data-mol-id={`btn-confirm-delete-expense-${expense.id}`}
                      disabled={deletingId === expense.id}
                      onClick={() => void handleDeleteExpense(expense.id)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'rounded-lg bg-error text-on-error transition-opacity disabled:opacity-60',
                      )}
                    >
                      {deletingId === expense.id
                        ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                        : t('group.deleteConfirm', {}, { defaultValue: 'Yes, delete' })}
                    </button>
                    <button
                      type="button"
                      data-mol-id={`btn-cancel-delete-expense-${expense.id}`}
                      onClick={() => setConfirmDeleteId(null)}
                      aria-label={t(
                        'group.deleteCancel',
                        { description: expense.description },
                        { defaultValue: 'Keep expense {{description}}' },
                      )}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 2),
                        'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        close
                      </span>
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    data-mol-id={`btn-delete-expense-${expense.id}`}
                    onClick={() => setConfirmDeleteId(expense.id)}
                    aria-label={t(
                      'group.deleteExpense',
                      { description: expense.description },
                      { defaultValue: 'Delete expense {{description}}' },
                    )}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 2),
                      'rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors shrink-0',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      delete
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          {expenses.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'group.expensesEmpty',
                {},
                { defaultValue: 'No expenses yet — add the first one above.' },
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
