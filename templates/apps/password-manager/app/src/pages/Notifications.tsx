import { useMemo } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useIncomingShares, useSecurityFindings, useVaultItems } from '../lib/api.js'

interface FeedRow {
  id: string
  icon: string
  title: string
  body: string
  when: string
  tone: 'danger' | 'warn' | 'success' | 'primary'
  link?: string
}

const TONE_STYLES = {
  danger: { tile: 'bg-error-light text-error', accent: 'border-red-300/60' },
  warn: { tile: 'bg-warning-light text-warning', accent: 'border-amber-300/60' },
  success: { tile: 'bg-success-light text-success', accent: 'border-emerald-300/60' },
  primary: { tile: 'bg-primary-light text-primary', accent: 'border-primary-light' },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`
  return `${Math.floor(diff / 86_400_000)} days ago`
}

export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const findings = useSecurityFindings()
  const shares = useIncomingShares()
  const items = useVaultItems({ is_trashed: false })

  const itemsById = useMemo(() => {
    const map = new Map<string, string>()
    for (const it of items.data) map.set(it.id, it.name)
    return map
  }, [items.data])

  const feed: FeedRow[] = useMemo(() => {
    const rows: FeedRow[] = []
    for (const f of findings.data) {
      if (f.dismissed) continue
      const name = f.item_id
        ? (itemsById.get(f.item_id) ??
          t('security.unknownItem', {}, { defaultValue: 'Vault item' }))
        : t('notif.vaultFallback', {}, { defaultValue: 'Vault' })
      const tone =
        f.severity === 'high' || f.severity === 'critical'
          ? 'danger'
          : f.severity === 'medium'
            ? 'warn'
            : 'primary'
      const titleByKind: Record<string, string> = {
        weak: t('notif.weak.title', {}, { defaultValue: 'Weak password detected' }),
        reused: t('notif.reused.title', {}, { defaultValue: 'Reused password' }),
        breached: t('notif.breach.title', {}, { defaultValue: 'Found in breach' }),
        old: t('notif.old.title', {}, { defaultValue: 'Stale password' }),
      }
      rows.push({
        id: `f-${f.id}`,
        icon:
          f.kind === 'breached'
            ? 'gpp_bad'
            : f.kind === 'weak'
              ? 'priority_high'
              : f.kind === 'reused'
                ? 'content_copy'
                : 'history',
        title:
          titleByKind[f.kind] ?? t('notif.finding.title', {}, { defaultValue: 'Security finding' }),
        body: t(
          'notif.finding.body',
          { name },
          { defaultValue: 'Issue detected on {{name}} — fix it now.' },
        ),
        when: relativeTime(f.detected_at),
        tone,
        link: f.item_id ? `/vault/${f.item_id}` : '/security',
      })
    }
    for (const s of shares.data) {
      rows.push({
        id: `s-${s.id}`,
        icon: 'group_add',
        title: t('notif.invite.title', {}, { defaultValue: 'Vault share invite' }),
        body: t(
          'notif.invite.body',
          { permission: s.permission },
          { defaultValue: 'You were invited with {{permission}} access.' },
        ),
        when: relativeTime(s.created_at),
        tone: 'primary',
        link: '/shared',
      })
    }
    return rows.slice(0, 50)
  }, [findings.data, shares.data, itemsById, t])

  const loading = findings.loading || shares.loading

  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        cm.flex({ direction: 'col', gap: 'xl' }),
        cm.maxW('4xl'),
        'mx-auto',
      )}
    >
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('nav.activity', {}, { defaultValue: 'Activity' })}
        </span>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'notif.subhead',
            {},
            {
              defaultValue:
                'Breach alerts, share invites, audit events, and rotation outcomes — surfaced in chronological order.',
            },
          )}
        </p>
      </header>

      {loading && (
        <p
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          data-testid="notif-loading"
        >
          {t('nav.loadingActivity', {}, { defaultValue: 'Loading activity…' })}
        </p>
      )}

      {!loading && feed.length === 0 && (
        <div
          data-testid="notif-empty"
          className={cm.cn(
            cm.sp('p', 8),
            'text-center bg-surface rounded-2xl border border-dashed border-primary-light/40',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('notif.empty', {}, { defaultValue: 'No activity yet — your vault is quiet.' })}
          </p>
        </div>
      )}

      {!loading && feed.length > 0 && (
        <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))} data-testid="notif-feed">
          {feed.map((row) => {
            const tone = TONE_STYLES[row.tone]
            const inner = (
              <>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-10 h-10 rounded-xl flex-shrink-0',
                    tone.tile,
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[20px]">{row.icon}</span>
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.flex1)}>
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface',
                      )}
                    >
                      {row.title}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {row.when}
                    </span>
                  </div>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {row.body}
                  </p>
                </div>
              </>
            )
            const cls = cm.cn(
              cm.flex({ align: 'start', gap: 'sm' }),
              cm.sp('p', 5),
              'bg-surface rounded-2xl border shadow-sm hover:shadow-md transition-all',
              tone.accent,
            )
            return (
              <li key={row.id} data-testid={`notif-${row.id}`}>
                {row.link ? (
                  <Link to={row.link} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Notifications
