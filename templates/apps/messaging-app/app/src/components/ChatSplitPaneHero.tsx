import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface ChatSplitPaneHeroProps {
  totalConversations: number
  unreadCount: number
  encryptedCount: number
  onlineCount: number
}

/**
 * Dark-sidebar split-pane hero for Hush — encrypted-by-default ribbon, three
 * key chat metrics rendered as glass-pill stats over a deep-slate panel with
 * decorative encryption-mesh overlay.
 *
 * Translated from team-chat's WelcomeHero/SideNavBar pattern, recoloured to
 * Hush's slate + indigo brand palette and adapted to surface chat-volume
 * + presence + encryption posture.
 */
export function ChatSplitPaneHero({
  totalConversations,
  unreadCount,
  encryptedCount,
  onlineCount,
}: ChatSplitPaneHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10',
      )}
      style={{ backgroundColor: 'var(--color-text)', minHeight: '320px' }}
    >
      {/* Encryption-mesh gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 35%, color-mix(in srgb, var(--color-accent) 45%, transparent) 0%, transparent 35%),' +
            'radial-gradient(circle at 70% 25%, color-mix(in srgb, var(--mol-color-success) 30%, transparent) 0%, transparent 30%),' +
            'radial-gradient(circle at 85% 70%, color-mix(in srgb, var(--mol-color-info) 30%, transparent) 0%, transparent 32%),' +
            'linear-gradient(135deg, var(--color-text) 0%, var(--mol-color-background-secondary) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Floating encryption pills */}
      {[
        { x: 12, y: 28, c: '#22d3ee' },
        { x: 28, y: 70, c: '#6366f1' },
        { x: 50, y: 22, c: '#10b981' },
        { x: 64, y: 60, c: '#a5b4fc' },
        { x: 82, y: 32, c: '#22d3ee' },
        { x: 90, y: 70, c: '#10b981' },
      ].map((d, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: d.c,
            boxShadow: `0 0 0 6px ${d.c}22, 0 0 0 12px ${d.c}11`,
          }}
          aria-hidden="true"
        />
      ))}

      <div
        className={'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute right-12 top-12 w-20 h-20 rounded-full bg-emerald-400/30 blur-2xl'}
        aria-hidden="true"
      />

      <div className={'relative z-10 p-8 lg:p-10 flex flex-col justify-between min-h-[320px]'}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <span
              className={'material-symbols-outlined text-emerald-300 text-base'}
              aria-hidden="true"
            >
              lock
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
              {t(
                'chatSplitPaneHero.e2eeLabel',
                {},
                { defaultValue: 'End-to-end encrypted · keys rotated daily' },
              )}
            </span>
          </div>
          <span
            className={
              'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface/10 backdrop-blur-md text-white/80'
            }
          >
            {t(
              'chatSplitPaneHero.appLabel',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} · private by nature' },
            )}
          </span>
        </div>

        <div className={'mt-6'}>
          <p className={'text-[11px] font-bold uppercase tracking-widest text-indigo-300/80 mb-2'}>
            {t('chatSplitPaneHero.eyebrow', {}, { defaultValue: 'Inbox · all conversations' })}
          </p>
          <h2 className={'text-4xl md:text-5xl font-extrabold tracking-tight leading-tight'}>
            {unreadCount > 0
              ? t(
                  'chatSplitPaneHero.unreadHeadline',
                  { count: unreadCount },
                  { defaultValue: '{{count}} unread, all encrypted' },
                )
              : t(
                  'chatSplitPaneHero.allReadHeadline',
                  {},
                  { defaultValue: 'You’re all caught up' },
                )}
          </h2>
        </div>

        <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }), 'mt-8')}>
          {[
            {
              label: t('chatSplitPaneHero.threads', {}, { defaultValue: 'Threads' }),
              value: totalConversations.toString(),
              color: 'text-white',
            },
            {
              label: t('status.unread', {}, { defaultValue: 'Unread' }),
              value: unreadCount.toString(),
              color: unreadCount > 0 ? 'text-accent-light' : 'text-white/60',
            },
            {
              label: t('settings.online', {}, { defaultValue: 'Online' }),
              value: onlineCount.toString(),
              color: 'text-emerald-300',
            },
            {
              label: t('chatSplitPaneHero.encrypted', {}, { defaultValue: 'E2EE' }),
              value: encryptedCount.toString(),
              color: 'text-cyan-300',
            },
          ].map((stat) => (
            <div key={stat.label} className={'bg-surface/10 backdrop-blur-md rounded-xl p-3'}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                {stat.label}
              </p>
              <p className={cm.cn('text-2xl font-extrabold tabular-nums mt-1', stat.color)}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
