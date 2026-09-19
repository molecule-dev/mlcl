import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatSignedCents } from '../lib/money.js'

interface GroupRow {
  id: string
  name: string
  description: string | null
  currency: string
  member_count: number
  members: { id: string; name: string; is_self: boolean }[]
  my_balance_cents: number
  total_expenses_cents: number
}

export function Groups() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [memberNames, setMemberNames] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get<GroupRow[]>('/api/groups')
      .then((response) => {
        if (cancelled) return
        setGroups(Array.isArray(response?.data) ? (response.data as GroupRow[]) : [])
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const memberList = memberNames
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      await http.post('/api/groups', { name, member_names: memberList })
      setName('')
      setMemberNames('')
      setShowForm(false)
      const response = await http.get<GroupRow[]>('/api/groups')
      setGroups(Array.isArray(response?.data) ? (response.data as GroupRow[]) : [])
    } catch (err) {
      console.warn('Group create failed', err)
      setError(
        t('groups.createFailed', {}, { defaultValue: 'Could not create the group. Try again.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div data-mol-id="page-groups" className={cm.stack(8)}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('groups.eyebrow', {}, { defaultValue: 'Shared costs live here' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}
          >
            {t('groups.title', {}, { defaultValue: 'Groups' })}
          </h1>
        </div>
        <button
          type="button"
          data-mol-id="btn-toggle-new-group"
          onClick={() => setShowForm((v) => !v)}
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
            group_add
          </span>
          {t('groups.new', {}, { defaultValue: 'New group' })}
        </button>
      </header>

      {error ? (
        <div
          data-mol-id="groups-error"
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

      {showForm ? (
        <form
          onSubmit={handleCreate}
          data-mol-id="form-new-group"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 space-y-5',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="group-name"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('groups.name', {}, { defaultValue: 'Group name' })}
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              placeholder={t(
                'groups.namePlaceholder',
                {},
                { defaultValue: 'Alpine Cabin Weekend' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
              )}
            />
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="group-members"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('groups.members', {}, { defaultValue: 'Members (comma-separated names)' })}
            </label>
            <input
              id="group-members"
              value={memberNames}
              onChange={(e) => setMemberNames(e.target.value)}
              placeholder={t(
                'groups.membersPlaceholder',
                {},
                { defaultValue: 'Maya, Jordan, Priya' },
              )}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
              )}
            />
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'groups.membersHint',
                {},
                { defaultValue: 'You are added automatically as the owner.' },
              )}
            </p>
          </div>
          <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
            <button
              type="button"
              data-mol-id="btn-cancel-new-group"
              onClick={() => setShowForm(false)}
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
              data-mol-id="btn-submit-new-group"
              disabled={creating || name.trim().length === 0}
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
                check
              </span>
              {creating
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('groups.create', {}, { defaultValue: 'Create group' })}
            </button>
          </div>
        </form>
      ) : null}

      <div
        className={cm.cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4')}
        data-mol-id="groups-grid"
      >
        {groups.map((group) => (
          <Link
            key={group.id}
            to={`/groups/${group.id}`}
            data-mol-id={`group-card-${group.id}`}
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface border border-outline-variant/40 hover:shadow-xl hover:-translate-y-1 transition-all group',
            )}
          >
            <div className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}>
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'group-hover:text-primary transition-colors',
                )}
              >
                {group.name}
              </h2>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-9 w-9 shrink-0 rounded-lg bg-primary-container text-on-primary-container',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-base')}>group</span>
              </span>
            </div>
            {group.description ? (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 2),
                  'text-on-surface-variant line-clamp-2',
                )}
              >
                {group.description}
              </p>
            ) : null}
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mt', 4))}>
              {group.members.slice(0, 5).map((member, idx) => (
                <span
                  key={member.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-7 w-7 rounded-full border-2 border-surface text-[10px] font-bold uppercase',
                  )}
                  style={{
                    background:
                      idx % 2 === 0
                        ? 'var(--color-primary-container)'
                        : 'var(--color-secondary-container)',
                    color: 'var(--color-on-primary-container)',
                    marginLeft: idx === 0 ? 0 : '-0.5rem',
                  }}
                  title={member.name}
                >
                  {member.name.slice(0, 2)}
                </span>
              ))}
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'groups.memberCount',
                  { count: group.member_count },
                  { defaultValue: '{{count}} members' },
                )}
              </span>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('mt', 5),
                'pt-4 border-t border-outline-variant/40',
              )}
            >
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'groups.totalTracked',
                  { total: formatSignedCents(group.total_expenses_cents) },
                  { defaultValue: '{{total}} tracked' },
                )}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'tabular-nums',
                  group.my_balance_cents < 0
                    ? 'text-error'
                    : group.my_balance_cents > 0
                      ? 'text-primary'
                      : 'text-on-surface-variant',
                )}
              >
                {group.my_balance_cents === 0
                  ? t('groups.settled', {}, { defaultValue: 'Settled up' })
                  : (group.my_balance_cents < 0
                      ? t('groups.youOwe', {}, { defaultValue: 'You owe' })
                      : t('groups.youAreOwed', {}, { defaultValue: 'You are owed' })) +
                    ' ' +
                    formatSignedCents(Math.abs(group.my_balance_cents))}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {loaded && groups.length === 0 && !showForm ? (
        <div
          data-mol-id="groups-empty"
          className={cm.cn(
            cm.sp('p', 10),
            cm.textCenter,
            'rounded-2xl bg-surface border border-dashed border-outline-variant',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant')}
            aria-hidden="true"
          >
            group_add
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 3), cm.fontWeight('semibold'))}>
            {t('groups.emptyTitle', {}, { defaultValue: 'No groups yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'groups.emptyBody',
              {},
              { defaultValue: 'Create a group, add people, and start splitting expenses.' },
            )}
          </p>
        </div>
      ) : null}
    </div>
  )
}
