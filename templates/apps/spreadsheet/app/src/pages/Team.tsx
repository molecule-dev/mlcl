import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CalciteKpiTile } from '../components/CalciteKpiTile.js'
import { WorkbenchLayout } from '../components/WorkbenchLayout.js'

interface CollaboratorRow {
  id: string
  spreadsheet_id: string
  owner_id: string
  user_id: string | null
  email: string | null
  role: 'viewer' | 'editor'
  invited_by: string | null
  accepted_at: string | null
  created_at: string
}

interface SpreadsheetRow {
  id: string
  title: string
}

const ROLE_TINT: Record<CollaboratorRow['role'], { bg: string; text: string; label: string }> = {
  editor: {
    bg: 'bg-success-light',
    text: 'text-success',
    label: 'Editor',
  },
  viewer: {
    bg: 'bg-surface-container-high',
    text: 'text-on-surface-variant',
    label: 'Viewer',
  },
}

function initialsFromEmail(email: string | null): string {
  if (!email) return '?'
  const parts = email.split(/[@._-]/).filter(Boolean)
  const a = parts[0]?.[0] ?? ''
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
  return (a + b).toUpperCase().slice(0, 2) || '??'
}

function colorForEmail(email: string | null): string {
  const palette = [
    '#2563eb',
    '#f59e0b',
    '#ec4899',
    '#10b981',
    '#8b5cf6',
    '#06b6d4',
    '#f97316',
    '#7c3aed',
  ]
  if (!email) return palette[0]!
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]!
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'now'
  const m = Math.round(ms / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [members, setMembers] = useState<CollaboratorRow[]>([])
  const [workbooks, setWorkbooks] = useState<SpreadsheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<CollaboratorRow['role']>('editor')
  const [inviteWorkbook, setInviteWorkbook] = useState<string>('')
  const [inviting, setInviting] = useState(false)

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [collabRes, wbRes] = await Promise.all([
        http.get<CollaboratorRow[]>('/spreadsheet-collaborators'),
        http.get<SpreadsheetRow[]>('/spreadsheets'),
      ])
      setMembers(Array.isArray(collabRes.data) ? collabRes.data : [])
      setWorkbooks(Array.isArray(wbRes.data) ? wbRes.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await fetchAll()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http]) // fetchAll intentionally omitted: re-creating it on each render would cause infinite re-fetch

  async function invite() {
    if (!inviteEmail || !inviteWorkbook) return
    setInviting(true)
    setError(null)
    try {
      await http.post('/spreadsheet-collaborators', {
        spreadsheet_id: inviteWorkbook,
        email: inviteEmail,
        role: inviteRole,
      })
      setShowInvite(false)
      setInviteEmail('')
      await fetchAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setInviting(false)
    }
  }

  async function remove(id: string) {
    setError(null)
    try {
      await http.delete(`/spreadsheet-collaborators/${id}`)
      await fetchAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const wbMap = useMemo(() => new Map(workbooks.map((w) => [w.id, w])), [workbooks])
  const editors = members.filter((m) => m.role === 'editor').length
  const accepted = members.filter((m) => m.accepted_at).length

  return (
    <WorkbenchLayout>
      <div
        className={cm.cn(cm.flex({ justify: 'between', align: 'end', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('nav.team', {}, { defaultValue: 'Team' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('lg'), 'text-on-surface-variant')}>
            {t(
              'team.subhead',
              {},
              { defaultValue: 'Collaborators across all your workbooks. Invite by email.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (workbooks.length === 0) return
            setInviteWorkbook(workbooks[0]!.id)
            setShowInvite(true)
          }}
          disabled={workbooks.length === 0}
          className={
            'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-primary rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed'
          }
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            person_add
          </span>
          {t('team.invite', {}, { defaultValue: 'Invite member' })}
        </button>
      </div>

      <div className={cm.cn(cm.grid({ cols: 4, gap: 'lg' }))}>
        <CalciteKpiTile
          icon="group"
          accent="primary"
          label={t('nav.members', {}, { defaultValue: 'Members' })}
          value={members.length}
        />
        <CalciteKpiTile
          icon="edit_note"
          accent="success"
          label={t('team.kpi.editorsLabel', {}, { defaultValue: 'Editors' })}
          value={editors}
        />
        <CalciteKpiTile
          icon="mark_email_read"
          accent="info"
          label={t('team.kpi.acceptedLabel', {}, { defaultValue: 'Accepted invites' })}
          value={accepted}
          status={
            members.length === 0 ? undefined : `${Math.round((accepted / members.length) * 100)}%`
          }
        />
        <CalciteKpiTile
          icon="grid_on"
          accent="warning"
          label={t('team.kpi.workbooksLabel', {}, { defaultValue: 'Shared workbooks' })}
          value={new Set(members.map((m) => m.spreadsheet_id)).size}
        />
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn('p-4 rounded-2xl text-sm bg-error-container/40 text-error')}
        >
          {error}
        </div>
      )}

      {showInvite && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void invite()
          }}
          className={cm.cn(
            cm.stack(3),
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold text-on-surface')}>
            {t('team.invite.headline', {}, { defaultValue: 'Invite a collaborator' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'sm' }))}>
            <div className={'col-span-12 md:col-span-5'}>
              <label
                htmlFor="invite-email"
                className={
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant'
                }
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none',
                )}
                placeholder="teammate@calcite.dev"
              />
            </div>
            <div className={'col-span-12 md:col-span-4'}>
              <label
                htmlFor="invite-workbook"
                className={
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant'
                }
              >
                {t('team.invite.workbook', {}, { defaultValue: 'Workbook' })}
              </label>
              <select
                id="invite-workbook"
                required
                value={inviteWorkbook}
                onChange={(e) => setInviteWorkbook(e.target.value)}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none',
                )}
              >
                {workbooks.map((wb) => (
                  <option key={wb.id} value={wb.id}>
                    {wb.title}
                  </option>
                ))}
              </select>
            </div>
            <div className={'col-span-12 md:col-span-3'}>
              <label
                htmlFor="invite-role"
                className={
                  'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant'
                }
              >
                {t('form.role', {}, { defaultValue: 'Role' })}
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as CollaboratorRow['role'])}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border-0 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none',
                )}
              >
                <option value="editor">
                  {t('team.role.editor', {}, { defaultValue: 'Editor' })}
                </option>
                <option value="viewer">
                  {t('team.role.viewer', {}, { defaultValue: 'Viewer' })}
                </option>
              </select>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
            <button
              type="submit"
              disabled={inviting || !inviteEmail || !inviteWorkbook}
              className={
                'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-primary rounded-full bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50'
              }
            >
              {inviting
                ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                : t('nav.invite', {}, { defaultValue: 'Send invite' })}
            </button>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className={
                'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-surface-variant rounded-full border border-outline-variant'
              }
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      )}

      <div
        className={
          'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 overflow-hidden'
        }
      >
        <header
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('px', 6),
            cm.sp('py', 4),
            'border-b border-outline-variant/40',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('nav.members', {}, { defaultValue: 'Members' })}
          </h2>
          <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
            {t('team.list.count', { count: members.length }, { defaultValue: '{{count}} active' })}
          </span>
        </header>
        {loading ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('team.loading', {}, { defaultValue: 'Loading collaborators…' })}
          </p>
        ) : members.length === 0 ? (
          <div className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.stack(2))}>
            <p className={cm.cn(cm.textSize('lg'), 'font-bold text-on-surface')}>
              {t('team.empty.headline', {}, { defaultValue: 'No collaborators yet.' })}
            </p>
            <p className={'text-sm text-on-surface-variant'}>
              {workbooks.length === 0
                ? t(
                    'team.empty.noWorkbooks',
                    {},
                    {
                      defaultValue: 'Create your first workbook before inviting collaborators.',
                    },
                  )
                : t('team.empty.hint', {}, { defaultValue: 'Hit "Invite member" to get started.' })}
            </p>
            {workbooks.length === 0 && (
              <Link
                to="/workbooks"
                className={
                  'inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-primary rounded-full bg-primary-fixed hover:opacity-90 transition-opacity self-center'
                }
              >
                {t('team.empty.cta', {}, { defaultValue: 'Go to workbooks' })}
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto" tabIndex={0}>
            <table className={'w-full text-sm'}>
              <thead>
                <tr className="bg-surface-container-low">
                  <th
                    className={
                      'text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant'
                    }
                  >
                    {t('status.member', {}, { defaultValue: 'Member' })}
                  </th>
                  <th
                    className={
                      'text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant'
                    }
                  >
                    {t('form.role', {}, { defaultValue: 'Role' })}
                  </th>
                  <th
                    className={
                      'text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant'
                    }
                  >
                    {t('team.col.workbook', {}, { defaultValue: 'Workbook' })}
                  </th>
                  <th
                    className={
                      'text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant'
                    }
                  >
                    {t('nav.status', {}, { defaultValue: 'Status' })}
                  </th>
                  <th
                    className={
                      'text-right px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant'
                    }
                  >
                    {t('team.col.activity', {}, { defaultValue: 'Invited' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {members.map((m) => {
                  const tint = ROLE_TINT[m.role]
                  const wb = wbMap.get(m.spreadsheet_id)
                  return (
                    <tr key={m.id} className={'hover:bg-surface-container-low transition-colors'}>
                      <td className={'px-6 py-3'}>
                        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                          <span
                            className={
                              'w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white shrink-0'
                            }
                            style={{ backgroundColor: colorForEmail(m.email) }}
                            aria-hidden="true"
                          >
                            {initialsFromEmail(m.email)}
                          </span>
                          <p className={'text-xs text-on-surface font-mono truncate'}>
                            {m.email ?? m.user_id ?? '—'}
                          </p>
                        </div>
                      </td>
                      <td className={'px-6 py-3'}>
                        <span
                          className={cm.cn(
                            'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                            tint.bg,
                            tint.text,
                          )}
                        >
                          {t(`team.role.${m.role}`, {}, { defaultValue: tint.label })}
                        </span>
                      </td>
                      <td className={'px-6 py-3 text-on-surface-variant'}>
                        {wb ? (
                          <Link
                            to={`/workbooks/${wb.id}`}
                            className={'hover:text-primary transition-colors'}
                          >
                            {wb.title}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={'px-6 py-3'}>
                        {m.accepted_at ? (
                          <span
                            className={
                              'inline-flex items-center gap-1 text-success text-xs font-bold'
                            }
                          >
                            <span
                              className={'material-symbols-outlined text-base'}
                              aria-hidden="true"
                            >
                              verified
                            </span>
                            {t('team.status.accepted', {}, { defaultValue: 'Accepted' })}
                          </span>
                        ) : (
                          <span
                            className={
                              'inline-flex items-center gap-1 text-on-surface-variant text-xs font-bold'
                            }
                          >
                            <span
                              className={'material-symbols-outlined text-base'}
                              aria-hidden="true"
                            >
                              schedule_send
                            </span>
                            {t('status.pending', {}, { defaultValue: 'Pending' })}
                          </span>
                        )}
                      </td>
                      <td
                        className={
                          'px-6 py-3 text-right text-xs font-bold uppercase tracking-widest text-on-surface-variant'
                        }
                      >
                        <div
                          className={cm.cn(cm.flex({ justify: 'end', align: 'center', gap: 'sm' }))}
                        >
                          <span>{formatRelative(m.created_at)}</span>
                          <button
                            type="button"
                            onClick={() => remove(m.id)}
                            aria-label={t(
                              'team.remove',
                              {},
                              { defaultValue: 'Remove collaborator' },
                            )}
                            className={'text-error hover:text-error-hover'}
                          >
                            <span
                              className="material-symbols-outlined text-base"
                              aria-hidden="true"
                            >
                              close
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </WorkbenchLayout>
  )
}

export default Team
