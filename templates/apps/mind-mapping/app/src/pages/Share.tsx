import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Collaborator {
  id: string
  map_id: string
  user_id: string | null
  email: string | null
  role: 'viewer' | 'commenter' | 'editor'
  accepted_at: string | null
}

interface MapDetail {
  id: string
  title: string
  is_public: boolean
  public_slug: string | null
  owner_id: string
}

const ROLE_BADGE: Record<Collaborator['role'], string> = {
  editor: 'bg-tertiary-fixed text-on-tertiary-fixed',
  commenter: 'bg-primary-fixed text-on-primary-fixed',
  viewer: 'bg-surface-container-high text-on-surface-variant',
}

const initialsFor = (input: string | null): string => {
  if (!input) return '··'
  const trimmed = input.trim()
  if (!trimmed) return '··'
  const parts = trimmed.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '·').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase()
}

export function Share() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [map, setMap] = useState<MapDetail | null>(null)
  const [collabs, setCollabs] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'commenter' | 'editor'>('editor')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [mapRes, collabRes] = await Promise.all([
        http.get<MapDetail>(`/maps/${id}`),
        http.get<Collaborator[]>(`/collaborators?map_id=${id}`),
      ])
      setMap(mapRes?.data ?? null)
      setCollabs(collabRes?.data ?? [])
      setError(null)
    } catch (error) {
      logError('share.load', error)
      setError(t('share.loadError', {}, { defaultValue: 'Could not load sharing settings.' }))
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void load()
  }, [load])

  const handleInvite = async () => {
    if (!id || !inviteEmail.trim()) return
    setInviting(true)
    setInfo(null)
    try {
      await http.post('/collaborators', {
        map_id: id,
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      setInviteEmail('')
      setInfo(
        t(
          'share.inviteSuccess',
          { email: inviteEmail.trim() },
          { defaultValue: 'Invited {{email}}.' },
        ),
      )
      await load()
    } catch (error) {
      logError('share.invite', error)
      setError(t('share.inviteError', {}, { defaultValue: 'Could not send invite.' }))
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (collabId: string, role: Collaborator['role']) => {
    setBusyId(collabId)
    try {
      await http.patch(`/collaborators/${collabId}`, { role })
      setCollabs((prev) => prev.map((c) => (c.id === collabId ? { ...c, role } : c)))
    } catch (error) {
      logError('share.roleChange', error)
      setError(t('share.roleError', {}, { defaultValue: 'Could not update role.' }))
    } finally {
      setBusyId(null)
    }
  }

  const handleRevoke = async (collabId: string) => {
    setBusyId(collabId)
    try {
      await http.delete(`/collaborators/${collabId}`)
      setCollabs((prev) => prev.filter((c) => c.id !== collabId))
    } catch (error) {
      logError('share.revoke', error)
      setError(t('share.revokeError', {}, { defaultValue: 'Could not remove collaborator.' }))
    } finally {
      setBusyId(null)
    }
  }

  const handleTogglePublic = async (next: boolean) => {
    if (!id || !map) return
    try {
      const slug = next
        ? map.public_slug ||
          `${
            map.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
              .slice(0, 32) || 'map'
          }-${id.slice(0, 8)}`
        : null
      const res = await http.patch<MapDetail>(`/maps/${id}`, {
        is_public: next,
        public_slug: slug,
      })
      if (res?.data) setMap(res.data)
    } catch (error) {
      logError('share.togglePublic', error)
      setError(t('share.publicError', {}, { defaultValue: 'Could not update link access.' }))
    }
  }

  const shareUrl =
    map?.public_slug && map.is_public && typeof window !== 'undefined'
      ? `${window.location.origin}/public/${map.public_slug}`
      : ''

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setInfo(t('share.copySuccess', {}, { defaultValue: 'Link copied.' }))
    } catch (error) {
      logError('share.copy', error)
      setError(t('share.copyError', {}, { defaultValue: 'Could not copy link.' }))
    }
  }

  return (
    <div className={cm.cn(cm.stack(8), 'max-w-3xl')}>
      <header className={cm.stack(2)}>
        <Link
          to={id ? `/maps/${id}` : '/maps'}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'text-primary uppercase tracking-widest hover:underline',
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>arrow_back</span>
          {t('share.backToMap', {}, { defaultValue: 'Back to map' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('share.title', {}, { defaultValue: 'Share this map' })}
        </h1>
        {map?.title && (
          <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>{map.title}</p>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-container/30 text-on-error-container border border-error/30',
          )}
        >
          {error}
        </div>
      )}
      {info && (
        <div
          role="status"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-tertiary-container/30 text-on-tertiary-container border border-tertiary/30',
          )}
        >
          {info}
        </div>
      )}

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(4),
          'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('share.invite.title', {}, { defaultValue: 'Invite by email' })}
        </h2>
        <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t(
              'auth.passwordPlaceholderNameCompany',
              {},
              { defaultValue: 'name@company.com' },
            )}
            data-mol-id="share-invite-email"
            className={cm.cn(
              cm.flex1,
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'min-w-[240px] rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all',
            )}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'commenter' | 'editor')}
            data-mol-id="share-invite-role"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-xl bg-surface-container-low border-0 outline-none focus:ring-2 focus:ring-primary/30',
            )}
          >
            <option value="editor">{t('nav.editor', {}, { defaultValue: 'Editor' })}</option>
            <option value="commenter">
              {t('share.role.commenter', {}, { defaultValue: 'Commenter' })}
            </option>
            <option value="viewer">{t('share.role.viewer', {}, { defaultValue: 'Viewer' })}</option>
          </select>
          <button
            type="button"
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            data-mol-id="share-invite-button"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {inviting
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : t('share.invite.button', {}, { defaultValue: 'Invite' })}
          </button>
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(4),
          'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('share.collaborators.title', {}, { defaultValue: 'People with access' })}
        </h2>
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : collabs.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'share.collaborators.empty',
              {},
              {
                defaultValue:
                  'No collaborators yet — invite teammates to start branching together.',
              },
            )}
          </p>
        ) : (
          <ul className={cm.stack(3)} data-mol-id="share-collaborator-list">
            {collabs.map((c) => (
              <li
                key={c.id}
                data-mol-id="share-collaborator"
                data-collab-id={c.id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  cm.sp('p', 3),
                  'rounded-xl hover:bg-surface-container-low transition-colors',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'rounded-full bg-primary text-on-primary shrink-0',
                    )}
                  >
                    {initialsFor(c.email)}
                  </span>
                  <div className={cm.cn('space-y-1 min-w-0')}>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'text-on-surface truncate',
                      )}
                    >
                      {c.email ??
                        t('share.unnamedCollaborator', {}, { defaultValue: 'Pending invite' })}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {c.accepted_at
                        ? t('share.accepted', {}, { defaultValue: 'Accepted' })
                        : t('share.pending', {}, { defaultValue: 'Pending invite' })}
                    </span>
                  </div>
                </div>
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <select
                    value={c.role}
                    onChange={(e) => handleRoleChange(c.id, e.target.value as Collaborator['role'])}
                    disabled={busyId === c.id}
                    data-mol-id="share-collaborator-role"
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest rounded-full border-0 outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60',
                      ROLE_BADGE[c.role],
                    )}
                  >
                    <option value="editor">
                      {t('nav.editor', {}, { defaultValue: 'Editor' })}
                    </option>
                    <option value="commenter">
                      {t('share.role.commenter', {}, { defaultValue: 'Commenter' })}
                    </option>
                    <option value="viewer">
                      {t('share.role.viewer', {}, { defaultValue: 'Viewer' })}
                    </option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRevoke(c.id)}
                    disabled={busyId === c.id}
                    data-mol-id="share-collaborator-revoke"
                    title={t('share.revoke', {}, { defaultValue: 'Remove access' })}
                    aria-label={t('share.revoke', {}, { defaultValue: 'Remove access' })}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(8),
                      cm.h(8),
                      'rounded-full hover:bg-error-container/40 text-on-surface-variant disabled:opacity-60',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                      close
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.stack(4),
          'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/30',
        )}
      >
        <div className={cm.flex({ justify: 'between', align: 'center' })}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('share.link.title', {}, { defaultValue: 'Public link' })}
          </h2>
          <button
            type="button"
            onClick={() => handleTogglePublic(!map?.is_public)}
            data-mol-id="share-public-toggle"
            aria-pressed={!!map?.is_public}
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.w(11),
              cm.h(6),
              'rounded-full transition-colors',
              map?.is_public ? 'bg-primary justify-end' : 'bg-surface-container-high justify-start',
            )}
          >
            <span
              className={cm.cn(cm.w(5), cm.h(5), 'rounded-full bg-on-primary shadow-md mx-0.5')}
            />
          </button>
        </div>
        {map?.is_public ? (
          <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
            <input
              type="text"
              readOnly
              value={shareUrl}
              data-mol-id="share-public-url"
              className={cm.cn(
                cm.flex1,
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'min-w-[240px] rounded-xl bg-surface-container-low border-0 outline-none font-mono',
              )}
            />
            <button
              type="button"
              onClick={handleCopy}
              data-mol-id="share-copy-button"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors',
              )}
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                content_copy
              </span>
              {t('common.copy', {}, { defaultValue: 'Copy' })}
            </button>
          </div>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'share.link.disabledHint',
              {},
              { defaultValue: 'Toggle on to mint a public read-only link to this map.' },
            )}
          </p>
        )}
      </section>
    </div>
  )
}

export default Share
