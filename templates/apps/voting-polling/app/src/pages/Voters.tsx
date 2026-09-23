import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { QuorumKpiCard } from '../components/QuorumKpiCard.js'

interface VoterRow {
  id: string
  name: string
  email: string
  organization?: string | null
  role?: string | null
  created_at?: string
}

interface VotersListResponse {
  data: VoterRow[]
  total: number
}

function timeAgo(iso?: string, now = Date.now()): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const sec = Math.max(0, Math.round((now - t) / 1000))
  if (sec < 60) return `${sec}s ago`
  const m = Math.round(sec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function Voters() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [voters, setVoters] = useState<VoterRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteOrg, setInviteOrg] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [editing, setEditing] = useState<VoterRow | null>(null)

  const refresh = useCallback(
    async (q?: string) => {
      setLoading(true)
      setError(null)
      try {
        const url = q ? `/api/voters?q=${encodeURIComponent(q)}` : '/api/voters'
        const res = await http.get<VotersListResponse>(url)
        const body = res.data as VotersListResponse | { data?: VoterRow[]; total?: number }
        setVoters(Array.isArray(body?.data) ? body.data : [])
        setTotal(typeof body?.total === 'number' ? body.total : (body?.data ?? []).length)
      } catch (err) {
        setError((err as Error).message ?? 'Failed to load voters')
      } finally {
        setLoading(false)
      }
    },
    [http],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  function startEdit(v: VoterRow) {
    setEditing(v)
    setInviteName(v.name)
    setInviteEmail(v.email)
    setInviteOrg(v.organization ?? '')
    setInviteRole(v.role ?? '')
    setInviteError(null)
    setShowInvite(true)
  }

  function startInvite() {
    setEditing(null)
    setInviteName('')
    setInviteEmail('')
    setInviteOrg('')
    setInviteRole('')
    setInviteError(null)
    setShowInvite(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setInviteError(null)
    try {
      const payload = {
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        organization: inviteOrg.trim() || null,
        role: inviteRole.trim() || null,
      }
      if (editing) {
        await http.put(`/api/voters/${editing.id}`, payload)
      } else {
        await http.post('/api/voters', payload)
        track({ name: 'voter.created', properties: { role: payload.role ?? null } })
      }
      setShowInvite(false)
      await refresh(search.trim() || undefined)
    } catch (err) {
      setInviteError(
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
          (err as Error).message ??
          'Failed to save voter',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(v: VoterRow) {
    if (
      !window.confirm(
        t(
          'voters.confirmDelete',
          { name: v.name },
          { defaultValue: 'Remove {{name}} from the eligibility roll?' },
        ),
      )
    )
      return
    try {
      await http.delete(`/api/voters/${v.id}`)
      track({ name: 'voter.deleted', properties: { voterId: v.id } })
      await refresh(search.trim() || undefined)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to delete voter')
    }
  }

  const recent = useMemo(() => voters.slice(0, 50), [voters])
  const orgs = useMemo(() => {
    const counts = new Map<string, number>()
    for (const v of voters) {
      const key =
        (v.organization ?? '').trim() || t('status.unassigned', {}, { defaultValue: 'Unassigned' })
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries()).slice(0, 6)
  }, [voters, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            {t('voters.eyebrow', {}, { defaultValue: 'Eligibility roll' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('voters.heading', {}, { defaultValue: 'Voter management' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), 'font-medium text-on-surface-variant')}>
            {t(
              'voters.subheading',
              {},
              {
                defaultValue: 'Curate the eligible roll. Group voters by org for weighted ballots.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={startInvite}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
          data-test="voters-invite-open"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            person_add
          </span>
          {t('voters.invite', {}, { defaultValue: 'Invite voter' })}
        </button>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
          )}
        >
          {error}
        </div>
      ) : null}

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <QuorumKpiCard
          icon="group"
          tone="primary"
          label={t('voters.kpi.eligible', {}, { defaultValue: 'Eligible voters' })}
          value={String(total)}
        />
        <QuorumKpiCard
          icon="trending_up"
          tone="accent"
          label={t('voters.kpi.recent', {}, { defaultValue: 'Added this week' })}
          value={String(
            voters.filter(
              (v) =>
                v.created_at &&
                Date.now() - new Date(v.created_at).getTime() < 7 * 24 * 3600 * 1000,
            ).length,
          )}
        />
        <QuorumKpiCard
          icon="rule"
          tone="warning"
          label={t('voters.kpi.orgs', {}, { defaultValue: 'Distinct orgs' })}
          value={String(new Set(voters.map((v) => v.organization).filter(Boolean)).size)}
        />
        <QuorumKpiCard
          icon="mail"
          tone="navy"
          label={t('voters.kpi.uniqueEmails', {}, { defaultValue: 'Unique emails' })}
          value={String(new Set(voters.map((v) => v.email)).size)}
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-4 min-w-0 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <header className={cm.sp('mb', 4)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('voters.groupsEyebrow', {}, { defaultValue: 'Organizations' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface mt-1',
              )}
            >
              {t('voters.groupsHeading', {}, { defaultValue: 'Most represented' })}
            </h2>
          </header>
          {orgs.length === 0 ? (
            <p className="text-xs text-on-surface-variant">
              {t('voters.noOrgs', {}, { defaultValue: 'No voters yet — invite your first.' })}
            </p>
          ) : (
            <ul className={cm.stack(2)}>
              {orgs.map(([name, count]) => (
                <li
                  key={name}
                  className={cm.cn(
                    cm.sp('p', 3),
                    'rounded-xl border border-outline-variant/20 flex items-center gap-3',
                  )}
                >
                  <span
                    className={cm.cn(
                      'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary font-extrabold text-xs shrink-0',
                    )}
                  >
                    {name[0]?.toUpperCase() ?? '?'}
                  </span>
                  <div className={cm.cn('min-w-0 flex-1')}>
                    <p className={cm.cn('text-sm font-extrabold text-on-surface truncate')}>
                      {name}
                    </p>
                    <p className={cm.cn('text-xs text-on-surface-variant tabular-nums')}>
                      {count} {t('voters.membersWord', {}, { defaultValue: 'voters' })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-8 min-w-0 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.sp('mb', 5),
            )}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {t('voters.rollEyebrow', {}, { defaultValue: 'Voter roll' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface mt-1',
                )}
              >
                {t('voters.rollHeading', {}, { defaultValue: 'Recently added' })}
              </h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void refresh(search.trim() || undefined)
              }}
              className={cm.flex({ align: 'center', gap: 'sm' })}
            >
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  'voters.searchPlaceholder',
                  {},
                  { defaultValue: 'Search by email…' },
                )}
                aria-label={t('voters.searchAria', {}, { defaultValue: 'Search voters by email' })}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                )}
                data-test="voters-search"
              />
            </form>
          </header>
          {loading ? (
            <p className="text-xs text-on-surface-variant" data-test="voters-loading">
              {t('voters.loading', {}, { defaultValue: 'Loading voters…' })}
            </p>
          ) : recent.length === 0 ? (
            <p className="text-xs text-on-surface-variant" data-test="voters-empty">
              {t(
                'voters.empty',
                {},
                { defaultValue: 'No voters in your roll yet — start by inviting a teammate.' },
              )}
            </p>
          ) : (
            <div className={cm.cn('overflow-x-auto -mx-6')}>
              <table className={cm.cn('min-w-full text-sm')} data-test="voters-table">
                <thead>
                  <tr className={cm.cn('border-b border-outline-variant/30')}>
                    <th
                      className={cm.cn(
                        'px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('voters.col.name', {}, { defaultValue: 'Voter' })}
                    </th>
                    <th
                      className={cm.cn(
                        'px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                    </th>
                    <th
                      className={cm.cn(
                        'px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('form.organization', {}, { defaultValue: 'Organization' })}
                    </th>
                    <th
                      className={cm.cn(
                        'px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('voters.col.added', {}, { defaultValue: 'Added' })}
                    </th>
                    <th
                      className={cm.cn(
                        'px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('nav.actions', {}, { defaultValue: 'Actions' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {recent.map((v) => (
                    <tr
                      key={v.id}
                      className={cm.cn('hover:bg-surface-container-low transition-colors')}
                      data-test={`voter-row-${v.id}`}
                    >
                      <td className={cm.cn('px-6 py-4')}>
                        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                          <span
                            className={cm.cn(
                              'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary font-bold text-sm',
                            )}
                          >
                            {v.name[0]?.toUpperCase() ?? '?'}
                          </span>
                          <span className="font-semibold text-on-surface">{v.name}</span>
                        </div>
                      </td>
                      <td className={cm.cn('px-6 py-4 font-mono text-on-surface-variant')}>
                        {v.email}
                      </td>
                      <td className={cm.cn('px-6 py-4 text-on-surface-variant')}>
                        {v.organization ?? '—'}
                      </td>
                      <td
                        className={cm.cn(
                          'px-6 py-4 text-right font-mono tabular-nums text-on-surface-variant',
                        )}
                      >
                        {timeAgo(v.created_at)}
                      </td>
                      <td className={cm.cn('px-6 py-4 text-right')}>
                        <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
                          <button
                            type="button"
                            onClick={() => startEdit(v)}
                            className={cm.cn('text-xs font-semibold text-primary hover:underline')}
                            data-test={`voter-edit-${v.id}`}
                          >
                            {t('common.edit', {}, { defaultValue: 'Edit' })}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(v)}
                            className={cm.cn('text-xs font-semibold text-error hover:underline')}
                            data-test={`voter-delete-${v.id}`}
                          >
                            {t('common.remove', {}, { defaultValue: 'Remove' })}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showInvite ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('voters.inviteModalAria', {}, { defaultValue: 'Invite voter' })}
          className={cm.cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm',
          )}
        >
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'w-full max-w-md rounded-2xl bg-surface-container-lowest shadow-2xl border border-outline-variant/30',
            )}
          >
            <header className={cm.flex({ align: 'center', justify: 'between' })}>
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {editing
                  ? t('voters.editTitle', {}, { defaultValue: 'Edit voter' })
                  : t('voters.inviteTitle', {}, { defaultValue: 'Invite a voter' })}
              </h2>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className={cm.cn('text-on-surface-variant hover:text-on-surface')}
                aria-label={t('common.close', {}, { defaultValue: 'Close' })}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </header>
            {inviteError ? (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.sp('mt', 4),
                  'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
                )}
                data-test="voters-invite-error"
              >
                {inviteError}
              </div>
            ) : null}
            <form onSubmit={handleSubmit} className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
              <label className={cm.stack(1)}>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </span>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                  )}
                  data-test="voters-invite-name"
                />
              </label>
              <label className={cm.stack(1)}>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </span>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                  )}
                  data-test="voters-invite-email"
                />
              </label>
              <label className={cm.stack(1)}>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t('form.organization', {}, { defaultValue: 'Organization' })}
                </span>
                <input
                  type="text"
                  value={inviteOrg}
                  onChange={(e) => setInviteOrg(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                  )}
                  data-test="voters-invite-org"
                />
              </label>
              <label className={cm.stack(1)}>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                  {t('form.role', {}, { defaultValue: 'Role' })}
                </span>
                <input
                  type="text"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  placeholder={t(
                    'voters.fieldRolePlaceholder',
                    {},
                    { defaultValue: 'e.g. Council member' },
                  )}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                  )}
                  data-test="voters-invite-role"
                />
              </label>
              <div
                className={cm.cn('mt-3', cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}
              >
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className={cm.cn(
                    'px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low text-sm font-semibold',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cm.cn(
                    'px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-50',
                  )}
                  data-test="voters-invite-submit"
                >
                  {submitting
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : editing
                      ? t('common.saveChanges', {}, { defaultValue: 'Save changes' })
                      : t('voters.add', {}, { defaultValue: 'Add to roll' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
