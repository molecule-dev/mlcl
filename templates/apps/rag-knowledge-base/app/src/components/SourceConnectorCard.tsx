import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type SourceKind =
  'google-drive' | 'notion' | 'confluence' | 'slack' | 'github' | 'web' | 'sharepoint' | 'upload'

export type SourceStatus = 'connected' | 'syncing' | 'error' | 'disconnected' | 'paused'

interface SourceConnectorCardProps {
  id: string
  name: string
  kind: SourceKind
  status: SourceStatus
  /** Number of indexed documents from this source. */
  documentCount: number
  /** Human-friendly last-sync label, e.g. "5 min ago". */
  lastSyncLabel?: string
  /** Optional schedule label, e.g. "Every 15 min". */
  scheduleLabel?: string
}

const KIND_HEX: Record<SourceKind, string> = {
  'google-drive': '#4285f4',
  notion: '#1e1b2e',
  confluence: '#2563eb',
  slack: '#5b47e0',
  github: '#1e1b2e',
  web: '#0891b2',
  sharepoint: '#16a34a',
  upload: '#e6a817',
}

const KIND_ICON: Record<SourceKind, string> = {
  'google-drive': 'cloud',
  notion: 'menu_book',
  confluence: 'workspaces',
  slack: 'chat',
  github: 'code',
  web: 'public',
  sharepoint: 'folder_shared',
  upload: 'upload_file',
}

const KIND_LABEL: Record<SourceKind, string> = {
  'google-drive': 'Google Drive',
  notion: 'Notion',
  confluence: 'Confluence',
  slack: 'Slack',
  github: 'GitHub',
  web: 'Web crawler',
  sharepoint: 'SharePoint',
  upload: 'Manual upload',
}

const STATUS_HEX: Record<SourceStatus, string> = {
  connected: 'var(--color-success)',
  syncing: 'var(--color-info)',
  error: 'var(--color-error)',
  disconnected: 'var(--color-on-surface-variant)',
  paused: 'var(--color-on-surface-variant)',
}

const STATUS_DEFAULT: Record<SourceStatus, string> = {
  connected: 'Connected',
  syncing: 'Syncing',
  error: 'Error',
  disconnected: 'Disconnected',
  paused: 'Paused',
}

/**
 * Source / connector card \u2014 vendor-tinted icon chip, name + kind label,
 * sync-status pill, document-count tabular-nums, hover-lift to source detail.
 *
 * Translated from crm/StatsRow + ai-chatbot-builder/IntegrationCard pattern \u2014
 * the connector ecosystem is the daily entry point for Sources, so each card
 * carries a vendor-recognizable color and icon.
 */
export function SourceConnectorCard({
  id,
  name,
  kind,
  status,
  documentCount,
  lastSyncLabel,
  scheduleLabel,
}: SourceConnectorCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const kindColor = KIND_HEX[kind]
  const statusColor = STATUS_HEX[status]

  return (
    <Link
      to={`/sources/${id}`}
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ direction: 'col', gap: 'md' }),
        'block group rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
      )}
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(12),
            cm.h(12),
            'rounded-xl shrink-0',
          )}
          style={{
            background: `color-mix(in srgb, ${kindColor} 12%, transparent)`,
            color: kindColor,
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 26 }}
            aria-hidden="true"
          >
            {KIND_ICON[kind]}
          </span>
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            'rounded-full font-semibold',
          )}
          style={{
            background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
            color: statusColor,
          }}
        >
          <span
            className={cm.cn('w-1.5 h-1.5 rounded-full')}
            style={{
              background: statusColor,
              animation: status === 'syncing' ? 'pulse 1.6s ease-in-out infinite' : undefined,
            }}
            aria-hidden="true"
          />
          {t(`sourceConnectorCard.status.${status}`, {}, { defaultValue: STATUS_DEFAULT[status] })}
        </span>
      </div>

      <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p className={cm.cn(cm.textSize('base'), 'font-semibold text-on-surface line-clamp-1')}>
          {name}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(`sourceConnectorCard.kind.${kind}`, {}, { defaultValue: KIND_LABEL[kind] })}
        </p>
      </div>

      <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
        <div className={cm.flex({ direction: 'col' })}>
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              'font-extrabold tracking-tight tabular-nums text-on-surface',
            )}
          >
            {documentCount.toLocaleString()}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant font-bold',
            )}
            style={{ fontSize: 10 }}
          >
            {t('sourceConnectorCard.indexed', {}, { defaultValue: 'Indexed docs' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'end' }),
            cm.textSize('xs'),
            'text-on-surface-variant text-right',
          )}
        >
          {lastSyncLabel ? (
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                className={cm.cn('material-symbols-outlined')}
                style={{ fontSize: 14 }}
                aria-hidden="true"
              >
                schedule
              </span>
              {lastSyncLabel}
            </span>
          ) : null}
          {scheduleLabel ? <span>{scheduleLabel}</span> : null}
        </div>
      </div>
    </Link>
  )
}
