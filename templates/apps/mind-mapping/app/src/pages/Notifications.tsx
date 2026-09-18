import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MapRow {
  id: string
  title: string
  owner_id: string
  is_shared?: boolean
  updated_at: string
}

interface CollaboratorRow {
  id: string
  map_id: string
  user_id: string | null
  email: string | null
  role: 'viewer' | 'commenter' | 'editor'
  accepted_at: string | null
}

interface PendingInvite {
  collab: CollaboratorRow
  map: MapRow
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user } = useAuth<UserProfile>()
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.email && !user?.id) {
      setInvites([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      // Single inbox endpoint returns all pending invites for the current user
      // joined with the map row — see api/src/handlers/collaborators.ts for the
      // matching logic (email or user_id, accepted_at IS NULL).
      const res = await http.get<PendingInvite[]>('/collaborators/inbox')
      setInvites(res?.data ?? [])
      setError(null)
    } catch (error) {
      logError('notifications.load', error)
      setError(
        t('nav.couldNotLoadNotifications', {}, { defaultValue: 'Could not load notifications.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t, user])

  useEffect(() => {
    void load()
  }, [load])

  const handleAccept = async (invite: PendingInvite): Promise<boolean> => {
    setBusyId(invite.collab.id)
    setInfo(null)
    try {
      await http.post(`/collaborators/${invite.collab.id}/accept`, {})
      setInvites((prev) => prev.filter((i) => i.collab.id !== invite.collab.id))
      setInfo(
        t(
          'notifications.acceptedInvite',
          { title: invite.map.title },
          { defaultValue: 'Joined {{title}}.' },
        ),
      )
      return true
    } catch (error) {
      logError('notifications.accept', error)
      setError(t('notifications.acceptError', {}, { defaultValue: 'Could not accept invite.' }))
      return false
    } finally {
      setBusyId(null)
    }
  }

  // Pending invites do not grant read access yet — the map only becomes
  // readable once the invite is accepted, so "open" must accept first.
  const handleAcceptAndOpen = async (invite: PendingInvite) => {
    const accepted = await handleAccept(invite)
    if (accepted) navigate(`/maps/${invite.map.id}`)
  }

  return (
    <div className={cm.cn(cm.stack(8), 'max-w-3xl')}>
      <header className={cm.stack(2)}>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
          {t(
            'notifications.subtitle',
            { count: invites.length },
            { defaultValue: '{{count}} pending invites.' },
          )}
        </p>
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

      {loading ? (
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.textCenter, cm.sp('py', 12))}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : invites.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.stack(3),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('3xl'),
              'material-symbols-outlined text-on-surface-variant/60',
            )}
          >
            inbox
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('notifications.empty.title', {}, { defaultValue: 'No pending invites' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'notifications.empty.body',
              {},
              { defaultValue: 'When teammates invite you to maps, they will appear here.' },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.stack(3)} data-mol-id="notifications-list">
          {invites.map((invite) => (
            <li
              key={invite.collab.id}
              data-mol-id="notification-invite"
              data-collab-id={invite.collab.id}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                cm.sp('p', 5),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(11),
                    cm.h(11),
                    'rounded-2xl bg-primary-container/40 text-on-primary-container shrink-0',
                  )}
                >
                  <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                    group_add
                  </span>
                </span>
                <div className={cm.cn(cm.stack(1), 'min-w-0')}>
                  <span
                    className={cm.cn(
                      cm.textSize('base'),
                      cm.fontWeight('bold'),
                      'text-on-surface truncate block',
                    )}
                  >
                    {t(
                      'notifications.inviteTitle',
                      { title: invite.map.title, role: invite.collab.role },
                      { defaultValue: 'Invited as {{role}} to "{{title}}"' },
                    )}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'notifications.inviteBody',
                      { email: invite.collab.email ?? '' },
                      { defaultValue: 'Sent to {{email}}' },
                    )}
                  </span>
                </div>
              </div>
              <div className={cm.flex({ gap: 'sm' })}>
                <button
                  type="button"
                  onClick={() => handleAccept(invite)}
                  disabled={busyId === invite.collab.id}
                  data-mol-id="notification-accept"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md disabled:opacity-60',
                  )}
                >
                  {t('notifications.accept', {}, { defaultValue: 'Accept' })}
                </button>
                <button
                  type="button"
                  onClick={() => handleAcceptAndOpen(invite)}
                  disabled={busyId === invite.collab.id}
                  data-mol-id="notification-accept-open"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    'rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-60',
                  )}
                >
                  {t('notifications.acceptAndOpen', {}, { defaultValue: 'Accept & open' })}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Notifications
