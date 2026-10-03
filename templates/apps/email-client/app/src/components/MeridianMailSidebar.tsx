import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useEmailCounts, useLabels, useStorageUsage } from '../lib/useEmails.js'

interface SidebarItem {
  to: string
  icon: string
  labelKey: string
  defaultLabel: string
  countKey?: string
  countTone?: 'primary' | 'starred' | 'draft' | 'muted'
}

interface MeridianMailSidebarProps {
  /**
   * Force the sidebar counts/labels to refetch — bump this number after
   * mutations (send / delete / move) so badges stay fresh.
   */
  refreshKey?: number
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const FOLDERS: SidebarItem[] = [
  {
    to: '/inbox',
    icon: 'inbox',
    labelKey: 'meridian.sidebar.inbox',
    defaultLabel: 'Inbox',
    countKey: 'unread',
    countTone: 'primary',
  },
  {
    to: '/starred',
    icon: 'star',
    labelKey: 'meridian.sidebar.starred',
    defaultLabel: 'Starred',
    countKey: 'starred',
    countTone: 'starred',
  },
  {
    to: '/drafts',
    icon: 'drafts',
    labelKey: 'meridian.sidebar.drafts',
    defaultLabel: 'Drafts',
    countKey: 'drafts',
    countTone: 'draft',
  },
  {
    to: '/sent',
    icon: 'send',
    labelKey: 'meridian.sidebar.sent',
    defaultLabel: 'Sent',
    countKey: 'sent',
  },
  {
    to: '/archive',
    icon: 'archive',
    labelKey: 'meridian.sidebar.archive',
    defaultLabel: 'Archive',
    countKey: 'archive',
  },
  {
    to: '/trash',
    icon: 'delete',
    labelKey: 'meridian.sidebar.trash',
    defaultLabel: 'Trash',
    countKey: 'trash',
  },
]

const COUNT_TONES: Record<NonNullable<SidebarItem['countTone']>, string> = {
  primary: 'bg-primary text-white',
  starred: 'bg-warning text-white',
  draft: 'bg-secondary text-white',
  muted: 'bg-surface-container text-on-surface-variant',
}

const LABEL_DOT_TONES: Record<string, string> = {
  Work: 'bg-primary',
  Personal: 'bg-warning',
  Travel: 'bg-success',
  Newsletters: 'bg-secondary',
  Newsletter: 'bg-secondary',
  Receipts: 'bg-warning',
  Urgent: 'bg-error',
}

/**
 * Left rail for the email-client shell — Compose CTA pill + folder
 * navigation backed by /api/emails/counts + /api/labels, plus a per-user
 * storage usage gauge computed from /api/emails/storage. Brand-blue
 * active state, pill counts, semantic colored dots for labels.
 *
 * Rendered by MeridianAppShell inside the shared ResponsiveAppShell's
 * `<aside>`/`<nav>` landmarks on BOTH breakpoints (desktop sidebar, mobile
 * drawer) — so this root is a plain `<div>` sized by the shell panel, and
 * the shared shell closes the drawer on navigation (no onNavigate prop).
 */
export function MeridianMailSidebar({ refreshKey = 0 }: MeridianMailSidebarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const { counts } = useEmailCounts(refreshKey)
  const { labels } = useLabels()
  const { storage } = useStorageUsage(refreshKey)
  const usedPct = storage
    ? Math.max(0, Math.min(1, storage.used_bytes / storage.quota_bytes)) * 100
    : 0
  const storageLabel = storage
    ? t(
        'meridian.sidebar.storageLabel',
        { used: formatBytes(storage.used_bytes), quota: formatBytes(storage.quota_bytes) },
        { defaultValue: '{{used}} of {{quota}}' },
      )
    : ''

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.sp('py', 5),
        cm.sp('px', 3),
        'h-full w-full bg-surface-container-lowest overflow-y-auto',
      )}
      data-mol-id="sidebar"
    >
      <Link
        to="/compose"
        data-mol-id="sidebar-compose"
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          cm.fontWeight('semibold'),
          cm.sp('py', 3),
          cm.sp('mb', 6),
          'rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          edit
        </span>
        {t('meridian.sidebar.compose', {}, { defaultValue: 'Compose' })}
      </Link>

      {/* Folder links live inside the shell's `<nav aria-label>` landmark. */}
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        {FOLDERS.map((f) => {
          const active = location.pathname === f.to
          const count = counts && f.countKey ? counts[f.countKey] : 0
          return (
            <Link
              key={f.to}
              to={f.to}
              data-mol-id={`sidebar-${f.to.replace(/\W+/g, '')}`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight(active ? 'semibold' : 'medium'),
                'rounded-xl transition-colors',
                active
                  ? 'bg-primary/10 text-primary-dark'
                  : 'text-on-surface hover:bg-surface-container-low',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                <span
                  className={cm.cn(
                    'material-symbols-outlined',
                    active ? '' : 'text-on-surface-variant',
                  )}
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  aria-hidden="true"
                >
                  {f.icon}
                </span>
                <span>{t(f.labelKey, {}, { defaultValue: f.defaultLabel })}</span>
              </span>
              {count > 0 && (
                <span
                  data-mol-id={`sidebar-count-${f.countKey ?? 'x'}`}
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    cm.roundedFull,
                    COUNT_TONES[f.countTone ?? 'muted'],
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <div className={cm.cn(cm.sp('mt', 6), cm.sp('pt', 4), 'border-t border-outline-variant/40')}>
        <p
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('mb', 2),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('meridian.sidebar.labels', {}, { defaultValue: 'Labels' })}
        </p>
        <ul
          className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}
          data-mol-id="sidebar-labels"
        >
          {labels.length === 0 && (
            <li
              className={cm.cn(cm.sp('px', 3), cm.textSize('xs'), 'text-on-surface-variant italic')}
            >
              {t('meridian.sidebar.noLabels', {}, { defaultValue: 'No labels yet' })}
            </li>
          )}
          {labels.map((l) => (
            <li key={l.id}>
              <Link
                to={`/inbox?label=${encodeURIComponent(l.id)}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.w('full'),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'rounded-xl text-on-surface hover:bg-surface-container-low transition-colors text-left',
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(2),
                    cm.h(2),
                    cm.roundedFull,
                    LABEL_DOT_TONES[l.name] ?? 'bg-on-surface-variant',
                  )}
                  style={LABEL_DOT_TONES[l.name] ? undefined : { backgroundColor: l.color }}
                  aria-hidden="true"
                />
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {storage && (
        <div
          className={cm.cn(cm.sp('pt', 6), cm.sp('px', 3), 'mt-auto')}
          data-mol-id="sidebar-storage"
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 2))}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('meridian.sidebar.storage', {}, { defaultValue: 'Storage' })}
            </span>
            <span
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}
              data-mol-id="sidebar-storage-label"
            >
              {storageLabel}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.h(2),
              cm.roundedFull,
              'bg-surface-container overflow-hidden',
            )}
          >
            <div
              className={'h-full bg-gradient-to-r from-primary to-secondary transition-all'}
              style={{ width: `${usedPct}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </div>
  )
}
