// Phase 1 baseline — verbatim JSX of design-ai-chatbot-builder-bots-list.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import MobileNavMenu, { useMainNavItems } from '../components/MobileNavMenu.js'
import UserMenu from '../components/UserMenu.js'

interface Bot {
  id: string
  name: string
  status?: string
  description?: string
  conversations?: number | string
  satisfaction?: number | string
  icon?: string
  updatedAt?: string
}

const iconContainerStyles = [
  'w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/5',
  'w-14 h-14 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary border-2 border-secondary/5',
  'w-14 h-14 rounded-full bg-surface-dim flex items-center justify-center text-on-surface-variant border-2 border-outline-variant/10',
  'w-14 h-14 rounded-full bg-tertiary-fixed-dim/20 flex items-center justify-center text-tertiary border-2 border-tertiary/5',
]

function BotsList() {
  const cm = getClassMap()
  const navItems = useMainNavItems()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    setLoadError(null)
    http
      .get<Bot[] | { data: Bot[] }>('/api/bots')
      .then((res) => {
        if (!active) return
        const body = (res as { data?: unknown } | null)?.data ?? res
        setBots(Array.isArray(body) ? (body as Bot[]) : [])
      })
      .catch(() => {
        if (!active) return
        setLoadError(
          t(
            'botsList.loadFailed',
            {},
            { defaultValue: 'Unable to load bots right now. Please refresh and try again.' },
          ),
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [http, t])

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (!openMenuId) return
    const close = () => setOpenMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])

  const filtered = search
    ? bots.filter((b) =>
        [b.name, b.description]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(search.toLowerCase())),
      )
    : bots

  return (
    <div className={cm.cn('bg-background text-on-surface min-h-screen flex')}>
      {/* SideNavBar (Authority: JSON) */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('p', 4),
          'fixed left-0 top-0 h-full w-[240px] z-40 bg-[var(--mol-color-background)] border-none',
          'hidden md:flex', // mobile: drawer in the header instead
        )}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mb', 10), cm.sp('px', 2), 'gap-3')}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded-lg bg-primary',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-white')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              neurology
            </span>
          </div>
          <div className={cm.flex({ direction: 'col' })}>
            <span
              className={cm.cn(
                cm.textSize('xl'),
                'font-extrabold text-primary dark:text-[var(--color-border-active)] tracking-tighter',
              )}
            >
              {APP_NAME}
            </span>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60',
              )}
            >
              {t('sideNavBar.brandTagline', {}, { defaultValue: 'AI Architect' })}
            </span>
          </div>
        </div>
        <nav className={cm.cn(cm.flex1, cm.stack(1))}>
          {/* Dashboard */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 transition-all duration-200 text-on-surface-variant hover:bg-surface/50 rounded-lg group',
            )}
            to="/"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="dashboard">
              dashboard
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
            </span>
          </Link>
          {/* My Bots (Active) */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 bg-surface text-primary dark:text-[var(--mol-color-primary-light)] font-bold rounded-lg shadow-sm group',
            )}
            to="/bots"
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              data-icon="smart_toy"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              smart_toy
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('nav.myBots', {}, { defaultValue: 'My Bots' })}
            </span>
          </Link>
          {/* Knowledge Base */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 transition-all duration-200 text-on-surface-variant hover:bg-surface/50 rounded-lg group',
            )}
            to="/knowledge-base"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="database">
              database
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('nav.knowledgeBase', {}, { defaultValue: 'Knowledge Base' })}
            </span>
          </Link>
          {/* Test Chat */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 transition-all duration-200 text-on-surface-variant hover:bg-surface/50 rounded-lg group',
            )}
            to="/test-chat"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="chat">
              chat
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('nav.testChat', {}, { defaultValue: 'Test Chat' })}
            </span>
          </Link>
          {/* Integrations */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 transition-all duration-200 text-on-surface-variant hover:bg-surface/50 rounded-lg group',
            )}
            to="/integrations"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="extension">
              extension
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
            </span>
          </Link>
          {/* Settings */}
          <Link
            className={cm.cn(
              'flex items-center gap-3 px-3 py-2.5 transition-all duration-200 text-on-surface-variant hover:bg-surface/50 rounded-lg group',
            )}
            to="/settings"
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
              settings
            </span>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('nav.settings', {}, { defaultValue: 'Settings' })}
            </span>
          </Link>
        </nav>
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('p', 2),
            'mt-auto bg-surface-container rounded-xl gap-3',
          )}
        >
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-surface-container-highest',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-base text-on-surface-variant')}>
              person
            </span>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'overflow-hidden')}>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'truncate')}>
              {user?.name ||
                user?.email ||
                t('userMenu.guestName', {}, { defaultValue: 'Account' })}
            </span>
            <span className={cm.cn('text-[10px] text-on-surface-variant truncate')}>
              {user?.name && user?.email
                ? user.email
                : t('sidebar.userPlan', {}, { defaultValue: 'Pro Plan' })}
            </span>
          </div>
        </div>
      </aside>
      {/* Main Canvas */}
      <main
        className={cm.cn(
          cm.flex1,
          cm.flex({ direction: 'col' }),
          'ml-0 md:ml-[240px] min-h-screen',
        )}
      >
        {/* TopNavBar (Authority: JSON) */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 4),
            cm.h(16),
            'sticky top-0 z-30 bg-background md:px-8',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, 'gap-4 min-w-0')}>
            {/* Mobile hamburger + drawer (fleet pattern) */}
            <MobileNavMenu items={navItems} />
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'tracking-tight text-on-surface hidden sm:block',
              )}
            >
              {t('nav.myBots', {}, { defaultValue: 'My Bots' })}
            </h1>
            <div className={cm.cn(cm.maxW('md'), 'relative w-full hidden md:block')}>
              <span
                className={cm.cn(
                  cm.textSize('xl'),
                  'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant',
                )}
                aria-hidden="true"
              >
                search
              </span>
              <input
                aria-label={t(
                  'botsList.searchPlaceholder',
                  {},
                  { defaultValue: 'Search your bots...' },
                )}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('py', 2),
                  cm.sp('pr', 4),
                  cm.sp('pl', 10),
                  'w-full bg-surface-container-highest border-none rounded-lg focus:ring-2 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all',
                )}
                placeholder={t(
                  'botsList.searchPlaceholder',
                  {},
                  { defaultValue: 'Search your bots...' },
                )}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <UserMenu />
            <Link
              className={cm.cn(
                'btn-gradient text-on-primary px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform',
              )}
              to="/bots/new"
            >
              <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>add</span>
              {t('botsList.createBot', {}, { defaultValue: 'Create Bot' })}
            </Link>
          </div>
        </header>
        {/* Content Area */}
        <div className={cm.cn(cm.sp('p', 4), cm.stack(8), 'md:p-8')}>
          {/* Mobile-only search (hidden in the header below md) */}
          <div className={cm.cn('relative md:hidden')}>
            <span
              className={cm.cn(
                cm.textSize('xl'),
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant',
              )}
              aria-hidden="true"
            >
              search
            </span>
            <input
              aria-label={t(
                'botsList.searchPlaceholder',
                {},
                { defaultValue: 'Search your bots...' },
              )}
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('py', 2),
                cm.sp('pr', 4),
                cm.sp('pl', 10),
                'w-full bg-surface-container-highest border-none rounded-lg focus:ring-2 focus:ring-primary/40 focus:bg-surface-container-lowest transition-all',
              )}
              placeholder={t(
                'botsList.searchPlaceholder',
                {},
                { defaultValue: 'Search your bots...' },
              )}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {loadError && (
            <div
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.flex({ align: 'center', justify: 'between' }),
                'rounded-lg bg-error-container text-on-error-container',
              )}
            >
              <span className={cm.cn(cm.textSize('sm'))}>{loadError}</span>
              <button
                className={cm.cn(cm.textSize('sm'), 'underline underline-offset-2')}
                onClick={() => window.location.reload()}
              >
                {t('common.retry', {}, { defaultValue: 'Retry' })}
              </button>
            </div>
          )}
          {actionError && (
            <div
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.flex({ align: 'center', justify: 'between' }),
                'rounded-lg bg-surface-container text-on-surface-variant',
              )}
            >
              <span className={cm.cn(cm.textSize('sm'))}>{actionError}</span>
              <button
                className={cm.cn(cm.textSize('sm'), 'underline underline-offset-2')}
                onClick={() => setActionError(null)}
              >
                {t('common.dismiss', {}, { defaultValue: 'Dismiss' })}
              </button>
            </div>
          )}
          {loading && (
            <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'xl:grid-cols-2')}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className={cm.cn(
                    cm.sp('p', 6),
                    'bg-surface-container-lowest rounded-xl border border-outline-variant/15 animate-pulse',
                  )}
                  style={{ minHeight: 220 }}
                />
              ))}
            </section>
          )}
          {!loading && filtered.length > 0 && (
            <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'xl:grid-cols-2')}>
              {filtered.map((bot, index) => (
                <div
                  key={bot.id}
                  role="link"
                  tabIndex={0}
                  data-bot-card-id={bot.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('a, button, [role="menu"]')) return
                    navigate(`/bots/${bot.id}/editor`)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/bots/${bot.id}/editor`)
                  }}
                >
                  <div
                    className={cm.cn(
                      cm.sp('p', 6),
                      'bg-surface-container-lowest rounded-xl border border-outline-variant/15 hover:shadow-xl hover:shadow-on-surface/5 transition-all group relative overflow-hidden cursor-pointer',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'start', justify: 'between' }),
                        cm.sp('mb', 4),
                      )}
                    >
                      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
                        <div className={iconContainerStyles[index % iconContainerStyles.length]}>
                          <span
                            aria-hidden="true"
                            className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined')}
                          >
                            {bot.icon ??
                              ['support_agent', 'trending_up', 'quiz', 'explore'][index % 4]}
                          </span>
                        </div>
                        <div>
                          <h3
                            className={cm.cn(
                              cm.textSize('lg'),
                              cm.fontWeight('bold'),
                              'text-on-surface',
                            )}
                          >
                            {bot.name}
                          </h3>
                          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
                            <span
                              className={cm.cn(
                                'w-2 h-2 rounded-full',
                                bot.status?.toLowerCase() === 'online'
                                  ? 'bg-tertiary'
                                  : 'bg-outline-variant',
                              )}
                            ></span>
                            <span
                              className={cm.cn(
                                'text-[10px] font-bold uppercase tracking-wider',
                                bot.status?.toLowerCase() === 'online'
                                  ? 'text-tertiary'
                                  : 'text-outline-variant',
                              )}
                            >
                              {bot.status ?? t('settings.offline', {}, { defaultValue: 'Offline' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={cm.cn('relative')}>
                        <button
                          aria-label={t(
                            'botsList.botActions',
                            { name: bot.name },
                            { defaultValue: 'Actions for {{name}}' },
                          )}
                          className={cm.cn(
                            cm.sp('p', 1),
                            'material-symbols-outlined text-outline hover:text-on-surface transition-colors',
                          )}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === bot.id ? null : bot.id)
                          }}
                        >
                          more_horiz
                        </button>
                        {openMenuId === bot.id && (
                          <div
                            role="presentation"
                            className={cm.cn(
                              cm.sp('mt', 1),
                              'absolute right-0 top-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg shadow-lg z-10 min-w-[140px]',
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              to={`/bots/${bot.id}/editor`}
                              className={cm.cn(
                                cm.textSize('sm'),
                                cm.sp('px', 4),
                                cm.sp('py', 2),
                                'block w-full text-left hover:bg-surface-container',
                              )}
                              onClick={() => setOpenMenuId(null)}
                            >
                              {t('botsList.openEditor', {}, { defaultValue: 'Open Editor' })}
                            </Link>
                            <Link
                              to={`/bots/${bot.id}/analytics`}
                              className={cm.cn(
                                cm.textSize('sm'),
                                cm.sp('px', 4),
                                cm.sp('py', 2),
                                'block w-full text-left hover:bg-surface-container',
                              )}
                              onClick={() => setOpenMenuId(null)}
                            >
                              {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
                            </Link>
                            <Link
                              to={`/bots/${bot.id}/settings`}
                              className={cm.cn(
                                cm.textSize('sm'),
                                cm.sp('px', 4),
                                cm.sp('py', 2),
                                'block w-full text-left hover:bg-surface-container',
                              )}
                              onClick={() => setOpenMenuId(null)}
                            >
                              {t('nav.settings', {}, { defaultValue: 'Settings' })}
                            </Link>
                            <Link
                              to={`/bots/${bot.id}/deploy`}
                              className={cm.cn(
                                cm.textSize('sm'),
                                cm.sp('px', 4),
                                cm.sp('py', 2),
                                'block w-full text-left hover:bg-surface-container',
                              )}
                              onClick={() => setOpenMenuId(null)}
                            >
                              {t('botsList.deploy', {}, { defaultValue: 'Deploy' })}
                            </Link>
                            <ConfirmButton
                              label={t('common.delete', {}, { defaultValue: 'Delete' })}
                              confirmLabel={t(
                                'botsList.confirmDelete',
                                { name: bot.name },
                                { defaultValue: 'Delete "{{name}}"? This cannot be undone.' },
                              )}
                              onConfirm={() =>
                                http
                                  .delete(`/api/bots/${bot.id}`)
                                  .then(() => {
                                    setActionError(null)
                                    setBots((xs) => xs.filter((x) => x.id !== bot.id))
                                    setOpenMenuId(null)
                                    void track({
                                      name: 'bot.deleted',
                                      properties: { bot_id: bot.id },
                                    })
                                  })
                                  .catch(() => {
                                    setActionError(
                                      t(
                                        'botsList.deleteFailed',
                                        {},
                                        {
                                          defaultValue:
                                            'Delete failed. This bot may still be connected to backend resources.',
                                        },
                                      ),
                                    )
                                  })
                              }
                              testId="bot-delete"
                              className={cm.cn(
                                cm.textSize('sm'),
                                cm.sp('px', 4),
                                cm.sp('py', 2),
                                'w-full justify-start text-left hover:bg-surface-container border-t border-outline-variant/20',
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mb', 6),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {bot.description}
                    </p>
                    <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), cm.sp('mb', 6))}>
                      <div className={cm.cn(cm.sp('p', 3), 'bg-surface-container-low rounded-lg')}>
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            cm.sp('mb', 1),
                            'block text-[10px] text-outline-variant uppercase tracking-tight',
                          )}
                        >
                          {t('botsList.conversations', {}, { defaultValue: 'Conversations' })}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('lg'),
                            cm.fontWeight('bold'),
                            'text-on-surface',
                          )}
                        >
                          {bot.conversations ?? '—'}
                        </span>
                      </div>
                      <div className={cm.cn(cm.sp('p', 3), 'bg-surface-container-low rounded-lg')}>
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            cm.sp('mb', 1),
                            'block text-[10px] text-outline-variant uppercase tracking-tight',
                          )}
                        >
                          {t('botsList.satisfaction', {}, { defaultValue: 'Satisfaction' })}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('lg'),
                            cm.fontWeight('bold'),
                            cm.flex({ align: 'center' }),
                            'text-on-surface gap-1',
                          )}
                        >
                          {bot.satisfaction ?? '—'}
                          {bot.satisfaction != null && (
                            <span
                              aria-hidden="true"
                              className={cm.cn(
                                cm.textSize('sm'),
                                'material-symbols-outlined text-warning',
                              )}
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className={cm.cn('flex items-center justify-between')}>
                      <span className={cm.cn('text-xs text-outline-variant italic')}>
                        {bot.updatedAt
                          ? t(
                              'botsList.updatedAt',
                              { date: bot.updatedAt },
                              { defaultValue: 'Updated {{date}}' },
                            )
                          : ''}
                      </span>
                      <Link
                        to={`/bots/${bot.id}/editor`}
                        className={cm.cn(
                          'bg-primary-fixed-dim/20 text-on-primary-fixed-variant px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary-fixed-dim/40 transition-colors flex items-center gap-2',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-sm')}
                          aria-hidden="true"
                        >
                          edit
                        </span>
                        {t('common.edit', {}, { defaultValue: 'Edit' })}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}
          {!loading && search && filtered.length === 0 && (
            <p className={cm.cn('text-center text-on-surface-variant py-16')}>
              {t(
                'botsList.noResults',
                { query: search },
                { defaultValue: 'No bots match "{{query}}".' },
              )}
            </p>
          )}
          {!loading && !search && bots.length === 0 && (
            <section
              className={cm.cn(
                'bg-surface-container-low rounded-3xl p-16 flex flex-col items-center text-center max-w-4xl mx-auto border-2 border-dashed border-outline-variant/20',
              )}
            >
              <div
                className={cm.cn(
                  'w-48 h-48 mb-8 bg-surface-container-highest rounded-full flex items-center justify-center overflow-hidden',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-primary opacity-80')}
                  style={{ fontSize: '8rem', fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  smart_toy
                </span>
              </div>
              <h2 className={cm.cn('text-3xl font-bold text-on-surface mb-4 tracking-tight')}>
                {t('botsList.emptyTitle', {}, { defaultValue: 'No bots yet' })}
              </h2>
              <p className={cm.cn('text-on-surface-variant max-w-md mb-10 text-lg')}>
                {t(
                  'botsList.emptyBody',
                  {},
                  {
                    defaultValue:
                      'Every AI assistant begins with a single prompt. Start building your first intelligent agent to automate your workflow.',
                  },
                )}
              </p>
              <Link
                className={cm.cn(
                  'btn-gradient text-on-primary px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95',
                )}
                to="/bots/new"
              >
                <span className={cm.cn('material-symbols-outlined')}>rocket_launch</span>
                {t('botsList.emptyCta', {}, { defaultValue: 'Create your first bot' })}
              </Link>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default BotsList
export { BotsList, BotsList as BotsListPage }
