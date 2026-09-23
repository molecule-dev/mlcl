// Phase 1 baseline — verbatim JSX of design-team-chat-dashboard.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import DashboardRightColumn from '../components/DashboardRightColumn.js'
import FloatingActionButton from '../components/FloatingActionButton.js'
import MessagePreviewCard from '../components/MessagePreviewCard.js'
import MobileTopBar from '../components/MobileTopBar.js'
import QuickActionCard from '../components/QuickActionCard.js'
import SideNavBar from '../components/SideNavBar.js'
import TopNavBar from '../components/TopNavBar.js'
import WelcomeHero from '../components/WelcomeHero.js'

interface Message {
  id: string | number
  channel?: string
  channelId?: string
  channel_id?: string
  channel_name?: string
  time?: string
  created_at?: string
  author?: string
  user?: string
  user_name?: string
  content?: string
  message?: string
  body?: string
  text?: string
}

function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelDesc, setNewChannelDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    // The recent-messages feed has its own endpoint: the plain
    // GET /api/messages requires a channel_id scope and 400s without one,
    // which used to kill this column (and trip the e2e console guard) on
    // every dashboard visit.
    http
      .get<Message[] | { data: Message[] }>('/api/messages/recent')
      .then((res) => {
        const body = res.data
        setMessages(Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [])
      })
      .catch((error: unknown) => {
        // The recent-messages column degrades to its empty state; log so a
        // failing messages API is still diagnosable.
        logError('dashboard.fetchMessages', error)
      })
      .finally(() => setLoading(false))
  }, [http])

  // The "/channels/new", "/compose", "/new-message" routes redirect here with
  // ?action=create-channel so a click on Create Channel / FAB / sidebar
  // "New Message" lands on a working create flow instead of an empty page.
  useEffect(() => {
    if (searchParams.get('action') === 'create-channel') {
      setShowCreate(true)
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!showCreate) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !creating) setShowCreate(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showCreate, creating])

  // Move focus into the dialog when it opens (dialog a11y — replaces the
  // declarative autoFocus attribute flagged by jsx-a11y/no-autofocus).
  const nameInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (showCreate) nameInputRef.current?.focus()
  }, [showCreate])

  const submitCreate = async () => {
    const name = newChannelName.trim()
    if (!name) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await http.post<
        { id: string; name: string } | { data: { id: string; name: string } }
      >('/api/channels', {
        name,
        description: newChannelDesc.trim() || undefined,
      })
      const body = res.data
      const created = body && 'data' in body ? body.data : body
      const id = created?.id
      setShowCreate(false)
      setNewChannelName('')
      setNewChannelDesc('')
      // Domain analytics: the create-channel funnel's success point.
      track({ name: 'channel.created', properties: { channel_id: String(id ?? ''), name } })
      if (id) navigate(`/channels/${id}`)
    } catch (e: unknown) {
      setCreateError(
        (e as { message?: string })?.message ||
          t('dashboard.createChannelError', {}, { defaultValue: 'Failed to create channel' }),
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.surface,
        cm.h('screen'),
        cm.w('full'),
        'text-on-surface antialiased overflow-hidden',
      )}
    >
      <SideNavBar />
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.h('screen'),
          'ml-0 w-full md:ml-[260px] md:w-[calc(100%-260px)]',
        )}
      >
        <MobileTopBar />
        <TopNavBar />
        <main className={cm.cn(cm.flex1, cm.surface, 'overflow-y-auto p-4 sm:p-6 md:p-12')}>
          <div className={cm.cn(cm.mxAuto, cm.stack(12), cm.maxW('5xl'))}>
            {/* Welcome Hero Section */}
            <WelcomeHero />
            <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'xl:grid-cols-3')}>
              {/* Left Column: Quick Actions & Activity */}
              <div className={cm.cn(cm.stack(8), 'xl:col-span-2')}>
                {/* Quick Actions Grid */}
                <div>
                  <h3
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 6),
                      'text-on-surface-variant uppercase tracking-widest',
                    )}
                  >
                    {t('dashboard.quickActions', {}, { defaultValue: 'Quick Actions' })}
                  </h3>
                  <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
                    <QuickActionCard
                      icon="add_circle"
                      title={t('dashboard.createChannel', {}, { defaultValue: 'Create Channel' })}
                      description={t(
                        'dashboard.createChannelDesc',
                        {},
                        { defaultValue: 'Setup a new space for collaboration' },
                      )}
                      onClick={() => setShowCreate(true)}
                    />
                    <QuickActionCard
                      icon="chat"
                      title={t('dashboard.startDm', {}, { defaultValue: 'Start DM' })}
                      description={t(
                        'dashboard.startDmDesc',
                        {},
                        { defaultValue: 'Message a team member directly' },
                      )}
                      onClick={() => setShowCreate(true)}
                    />
                    <QuickActionCard
                      icon="search_check"
                      title={t('dashboard.browseChannels', {}, { defaultValue: 'Browse Channels' })}
                      description={t(
                        'dashboard.browseChannelsDesc',
                        {},
                        { defaultValue: 'Explore existing public discussions' },
                      )}
                      onClick={() => {
                        const el = document.querySelector('[data-mol-id="side-nav-channels"]')
                        if (el && 'scrollIntoView' in el)
                          (el as HTMLElement).scrollIntoView({ behavior: 'smooth' })
                      }}
                    />
                    <QuickActionCard
                      icon="person_add"
                      title={t('dashboard.inviteMembers', {}, { defaultValue: 'Invite Members' })}
                      description={t(
                        'dashboard.inviteMembersDesc',
                        {},
                        { defaultValue: 'Grow your workspace' },
                      )}
                      onClick={() => navigate('/settings')}
                    />
                  </div>
                </div>
                {/* Unread Messages Preview */}
                <div>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('mb', 6),
                    )}
                  >
                    <h3
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('bold'),
                        'text-on-surface-variant uppercase tracking-widest',
                      )}
                    >
                      {t('dashboard.unreadMessages', {}, { defaultValue: 'Unread Messages' })}
                    </h3>
                    <Link
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.textPrimary,
                        'flex min-h-[36px] items-center px-2 hover:underline',
                      )}
                      to="/channels"
                    >
                      {t('common.viewAll', {}, { defaultValue: 'View All' })}
                    </Link>
                  </div>
                  <div className={cm.stack(3)}>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          aria-hidden="true"
                          className={cm.cn(
                            cm.sp('p', 5),
                            cm.h('[72px]'),
                            'bg-surface-container-lowest rounded-xl animate-pulse',
                          )}
                        />
                      ))
                    ) : messages.length === 0 ? (
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.textCenter,
                          cm.sp('py', 8),
                          'text-on-surface-variant',
                        )}
                      >
                        {t(
                          'dashboard.noUnreadMessages',
                          {},
                          { defaultValue: 'No unread messages' },
                        )}
                      </p>
                    ) : (
                      messages.slice(0, 3).map((msg) => (
                        <Link
                          key={String(msg.id)}
                          to={`/channels/${msg.channelId ?? msg.channel_id ?? String(msg.id)}`}
                          className={cm.cn('contents')}
                        >
                          <MessagePreviewCard
                            channel={String(
                              msg.channel_name ||
                                msg.channel ||
                                t(
                                  'messagePreviewCard.unknownChannel',
                                  {},
                                  { defaultValue: '#channel' },
                                ),
                            )}
                            time={String(msg.time || msg.created_at || '')}
                            author={String(msg.author || msg.user || msg.user_name || '')}
                            message={String(
                              msg.content || msg.message || msg.body || msg.text || '',
                            )}
                          />
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
              {/* Right Column: Stats & Profile */}
              <DashboardRightColumn />
            </div>
          </div>
        </main>
      </div>
      <FloatingActionButton onClick={() => setShowCreate(true)} />
      {showCreate && (
        <div
          data-mol-id="create-channel-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creating) setShowCreate(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            backgroundColor: 'color-mix(in srgb, var(--color-inverse-surface) 50%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            data-mol-id="create-channel-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-channel-title"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <h2
              id="create-channel-title"
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}
            >
              {t('dashboard.createChannel', {}, { defaultValue: 'Create Channel' })}
            </h2>
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'block uppercase tracking-wider text-foreground-secondary',
              )}
            >
              {t('form.name', {}, { defaultValue: 'Name' })}
            </label>
            <input
              ref={nameInputRef}
              data-mol-id="create-channel-name"
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreate()
              }}
              placeholder={t(
                'dashboard.channelNamePlaceholder',
                {},
                { defaultValue: 'e.g. design-reviews' },
              )}
              className={cm.cn(cm.sp('p', 2), cm.sp('mt', 2), cm.sp('mb', 4), cm.w('full'))}
              style={{ border: '1px solid var(--color-outline-variant)', borderRadius: '8px' }}
            />
            <label
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'block uppercase tracking-wider text-foreground-secondary',
              )}
            >
              {t('form.descriptionOptional', {}, { defaultValue: 'Description (optional)' })}
            </label>
            <input
              data-mol-id="create-channel-desc"
              type="text"
              value={newChannelDesc}
              onChange={(e) => setNewChannelDesc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreate()
              }}
              className={cm.cn(cm.sp('p', 2), cm.sp('mt', 2), cm.sp('mb', 4), cm.w('full'))}
              style={{ border: '1px solid var(--color-outline-variant)', borderRadius: '8px' }}
            />
            {createError && (
              <p
                data-mol-id="create-channel-error"
                className={cm.cn(cm.textSize('sm'), cm.sp('mb', 3), 'text-error')}
              >
                {createError}
              </p>
            )}
            <div className={cm.cn(cm.flex({ justify: 'end' }), 'gap-2')}>
              <button
                type="button"
                data-mol-id="create-channel-cancel"
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                )}
                style={{
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-container-low)',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                data-mol-id="create-channel-submit"
                onClick={submitCreate}
                disabled={!newChannelName.trim() || creating}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                )}
                style={{
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  opacity: !newChannelName.trim() || creating ? 0.6 : 1,
                }}
              >
                {creating
                  ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                  : t('common.create', {}, { defaultValue: 'Create' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
export { Dashboard, Dashboard as DashboardPage }
