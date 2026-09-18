/**
 * Right-rail customer profile panel — 48px avatar header, collapsible
 * label/value rows, recent-conversation list. Used inside the Inbox
 * three-pane layout and on ContactDetail.
 *
 * Translated from crm CustomerSidePanel + ai-customer-service-bot
 * EscalationItem; styling per DESIGN.md "Customer Detail Panel".
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusPill } from './StatusPill.js'

interface CustomerProperty {
  label: string
  value: string
}

interface RecentConversation {
  id: string
  subject: string
  ago: string
  resolved: boolean
}

interface CustomerProfilePanelProps {
  name: string
  email: string
  initials?: string
  presence?: 'online' | 'away' | 'offline'
  csat?: number | null
  properties?: CustomerProperty[]
  recent?: RecentConversation[]
}

const PRESENCE_TEXT = {
  online: 'Online now',
  away: 'Away',
  offline: 'Offline',
} as const

function CustomerProfilePanel({
  name,
  email,
  initials,
  presence = 'offline',
  csat,
  properties = [],
  recent = [],
}: CustomerProfilePanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const initialsFallback =
    initials ??
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 6 }),
        cm.sp('p', 6),
        cm.h('full'),
        'bg-surface border-l border-[color:var(--color-border)] overflow-y-auto',
      )}
    >
      <header className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 2 }))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(12),
            cm.h(12),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('lg'),
            'bg-primary/15 text-primary-dark',
          )}
        >
          {initialsFallback}
        </div>
        <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
          {name}
        </h3>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{email}</span>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(`customerProfilePanel.${presence}`, {}, { defaultValue: PRESENCE_TEXT[presence] })}
        </span>
        {csat != null && (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }), cm.sp('mt', 1))}>
            <span className="material-symbols-outlined text-warning" style={{ fontSize: 16 }}>
              star
            </span>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {csat.toFixed(1)}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('customerProfilePanel.csatLabel', {}, { defaultValue: 'CSAT' })}
            </span>
          </div>
        )}
      </header>
      {properties.length > 0 && (
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
          <h4
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('customerProfilePanel.propertiesTitle', {}, { defaultValue: 'Customer details' })}
          </h4>
          <dl className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            {properties.map((property) => (
              <div
                key={property.label}
                className={cm.cn(cm.flex({ justify: 'between', gap: 3 }), cm.textSize('sm'))}
              >
                <dt className={cm.cn('text-on-surface-variant')}>{property.label}</dt>
                <dd className={cm.cn(cm.fontWeight('medium'), 'text-on-surface text-right')}>
                  {property.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {recent.length > 0 && (
        <section className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
          <h4
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('customerProfilePanel.recentTitle', {}, { defaultValue: 'Recent conversations' })}
          </h4>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            {recent.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  to={`/conversation/${conversation.id}`}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 1 }),
                    cm.sp('p', 3),
                    'rounded-md hover:bg-surface-secondary transition-colors',
                  )}
                >
                  <div className={cm.cn(cm.flex({ justify: 'between', align: 'center', gap: 2 }))}>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface truncate',
                      )}
                    >
                      {conversation.subject}
                    </span>
                    <StatusPill variant={conversation.resolved ? 'resolved' : 'pending'} />
                  </div>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {conversation.ago}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}

export default CustomerProfilePanel
export { CustomerProfilePanel }
