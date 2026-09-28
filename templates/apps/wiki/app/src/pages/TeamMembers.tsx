import { useMemo, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatPill, type StatPillTone } from '../components/StatPill.js'

interface Member {
  id: string
  name: string
  initials: string
  email: string
  role: 'owner' | 'editor' | 'viewer'
  pages: number
  lastActive: string
}

interface AuditEntry {
  id: string
  who: string
  whoInitials: string
  action: string
  target: string
  when: string
}

// TODO: replace with /api/team/members + /api/team/audit once backend lands
const MEMBERS: Member[] = [
  {
    id: 'm1',
    name: 'Alex Lin',
    initials: 'AL',
    email: 'alex@cairn.dev',
    role: 'owner',
    pages: 142,
    lastActive: '2 minutes ago',
  },
  {
    id: 'm2',
    name: 'Mira Khan',
    initials: 'MK',
    email: 'mira@cairn.dev',
    role: 'editor',
    pages: 86,
    lastActive: '40 minutes ago',
  },
  {
    id: 'm3',
    name: 'Sam Park',
    initials: 'SP',
    email: 'sam@cairn.dev',
    role: 'editor',
    pages: 64,
    lastActive: '2 hours ago',
  },
  {
    id: 'm4',
    name: 'Riya Mehra',
    initials: 'RM',
    email: 'riya@cairn.dev',
    role: 'editor',
    pages: 48,
    lastActive: 'Yesterday',
  },
  {
    id: 'm5',
    name: 'Jules Vega',
    initials: 'JV',
    email: 'jules@cairn.dev',
    role: 'editor',
    pages: 31,
    lastActive: '3 days ago',
  },
  {
    id: 'm6',
    name: 'Edith Mu',
    initials: 'EM',
    email: 'edith@cairn.dev',
    role: 'viewer',
    pages: 0,
    lastActive: '1 week ago',
  },
  {
    id: 'm7',
    name: 'Noor Farah',
    initials: 'NF',
    email: 'noor@cairn.dev',
    role: 'viewer',
    pages: 0,
    lastActive: '2 weeks ago',
  },
]

const AUDIT: AuditEntry[] = [
  {
    id: 'a1',
    who: 'Alex Lin',
    whoInitials: 'AL',
    action: 'changed role',
    target: 'Riya Mehra → Editor',
    when: '2h ago',
  },
  {
    id: 'a2',
    who: 'Alex Lin',
    whoInitials: 'AL',
    action: 'invited',
    target: 'noor@cairn.dev (Viewer)',
    when: 'Yesterday',
  },
  {
    id: 'a3',
    who: 'Mira Khan',
    whoInitials: 'MK',
    action: 'transferred ownership of',
    target: 'Engineering space → Alex',
    when: 'Last week',
  },
]

const ROLES: Member['role'][] = ['owner', 'editor', 'viewer']

export function TeamMembers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | Member['role']>('all')

  const filtered = useMemo(() => {
    return MEMBERS.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false
      if (!search) return true
      const blob = `${m.name} ${m.email}`.toLowerCase()
      return blob.includes(search.toLowerCase())
    })
  }, [search, roleFilter])

  const counts: Record<Member['role'], number> = useMemo(() => {
    return MEMBERS.reduce((acc, m) => ({ ...acc, [m.role]: acc[m.role] + 1 }), {
      owner: 0,
      editor: 0,
      viewer: 0,
    })
  }, [])

  return (
    <div className={cm.stack(8)}>
      <div className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), 'flex-wrap')}>
        <div className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('teamMembers.eyebrow', {}, { defaultValue: 'Workspace · Admin' })}
          </span>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('teamMembers.heading', {}, { defaultValue: 'Members & roles' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'teamMembers.subtitle',
              {},
              {
                defaultValue:
                  'Owner, Editor, Viewer — and an append-only audit log of every change.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {}}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'h-10 rounded-full bg-primary text-on-primary hover:bg-primary-hover transition-colors',
          )}
        >
          {/* TODO: open invite-member dialog */}
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            person_add
          </span>
          {t('teamMembers.invite', {}, { defaultValue: 'Invite member' })}
        </button>
      </div>

      <div className={cm.cn('grid gap-4 md:grid-cols-3')}>
        {ROLES.map((role) => (
          <div
            key={role}
            className={cm.cn(
              cm.sp('p', 5),
              cm.accentCard({ tone: 'primary' }),
              'rounded-xl bg-surface-container-lowest shadow-sm',
            )}
          >
            <p className={cm.accentCardLabel({ tone: 'primary' })}>
              {t(`teamMembers.role.${role}`, {}, { defaultValue: role })}
            </p>
            <p className={cm.cn('text-3xl font-extrabold text-on-surface tracking-tight')}>
              {counts[role]}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                `teamMembers.roleHint.${role}`,
                {},
                {
                  defaultValue:
                    role === 'owner'
                      ? 'Full admin · billing + space ownership'
                      : role === 'editor'
                        ? 'Can write + comment'
                        : 'Read-only access',
                },
              )}
            </p>
          </div>
        ))}
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(
            'teamMembers.searchPlaceholder',
            {},
            { defaultValue: 'Filter by name or email…' },
          )}
          className={cm.cn(
            cm.sp('px', 4),
            cm.textSize('sm'),
            'h-10 flex-1 min-w-[16rem] rounded-md border border-outline-variant/60 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/40',
          )}
        />
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('p', 1),
            'rounded-full bg-surface-container-low',
          )}
        >
          {(['all', ...ROLES] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.textSize('xs'),
                'h-8 rounded-full font-black uppercase tracking-widest transition-colors',
                roleFilter === r
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t(
                `teamMembers.filter.${r}`,
                {},
                { defaultValue: r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1) },
              )}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cm.cn(
          'overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
        )}
      >
        <table className={cm.cn('w-full')}>
          <thead className={cm.cn('bg-surface-container-low/60')}>
            <tr>
              {['member', 'role', 'pages', 'lastActive', 'actions'].map((col) => (
                <th
                  key={col}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('xs'),
                    'text-left font-black uppercase tracking-widest text-on-surface-variant',
                    col === 'actions' ? 'text-right' : '',
                  )}
                >
                  {t(
                    `teamMembers.col.${col}`,
                    {},
                    { defaultValue: col.charAt(0).toUpperCase() + col.slice(1) },
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-outline-variant/30')}>
            {filtered.map((m) => (
              <tr
                key={m.id}
                className={cm.cn('hover:bg-surface-container-low/50 transition-colors')}
              >
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'h-9 w-9 rounded-full bg-secondary/15 text-secondary',
                      )}
                      aria-hidden="true"
                    >
                      {m.initials}
                    </span>
                    <div className={cm.stack(0)}>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {m.name}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {m.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  <StatPill tone={m.role as StatPillTone}>
                    {t(`teamMembers.role.${m.role}`, {}, { defaultValue: m.role })}
                  </StatPill>
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'text-on-surface',
                  )}
                >
                  {m.pages.toLocaleString()}
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  {m.lastActive}
                </td>
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  <button
                    type="button"
                    onClick={() => {}}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'h-8 rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors',
                    )}
                  >
                    {/* TODO: open member management menu */}
                    {t('teamMembers.manage', {}, { defaultValue: 'Manage' })}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(4),
          'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
        )}
      >
        <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.auditLog', {}, { defaultValue: 'Audit log' })}
        </h2>
        <ul className={cm.stack(3)}>
          {AUDIT.map((a) => (
            <li key={a.id} className={cm.flex({ align: 'start', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'h-7 w-7 shrink-0 rounded-full bg-secondary/15 text-secondary',
                )}
                aria-hidden="true"
              >
                {a.whoInitials}
              </span>
              <p className={cm.cn(cm.textSize('sm'), 'flex-1 text-on-surface leading-snug')}>
                <span className={cm.cn('font-semibold')}>{a.who}</span>
                <span className={cm.cn('text-on-surface-variant')}> {a.action} </span>
                <span className={cm.cn('font-medium')}>{a.target}</span>
              </p>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{a.when}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
