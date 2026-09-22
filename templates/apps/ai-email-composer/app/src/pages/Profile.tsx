import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { StatusPill } from '../components/StatusPill.js'
import type { Tone } from '../components/TonePillRow.js'
import { loadPreferences } from '../lib/preferences.js'

interface DraftRow {
  id: string
  subject: string
  status: string
  ai_generated?: boolean
  updated_at?: string
  created_at?: string
}

interface SentRow {
  id: string
  draft_id: string
  recipient_email: string
  status: string
  created_at?: string
  updated_at?: string
}

interface TemplateRow {
  id: string
  name: string
  category: string
  updated_at?: string
  created_at?: string
}

interface ContactRow {
  id: string
  name?: string | null
  email: string
}

interface AuthUser {
  id?: string
  name?: string | null
  email?: string
  bio?: string | null
}

const TONE_CHIPS: ReadonlyArray<{ tone: Tone; defaultLabel: string; icon: string; tint: string }> =
  [
    { tone: 'persuasive', defaultLabel: 'Persuasive', icon: 'auto_awesome', tint: 'text-primary' },
    { tone: 'friendly', defaultLabel: 'Warm', icon: 'favorite', tint: 'text-secondary-dark' },
    { tone: 'formal', defaultLabel: 'Formal', icon: 'gavel', tint: 'text-info' },
  ]

function initialsFor(name: string, email: string): string {
  const source = (name || email || '').trim()
  if (!source) return '?'
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1][0] ?? '')).toUpperCase()
}

interface ActivityEntry {
  key: string
  label: string
  when: string
  icon: string
  tint: string
  ts: number
}

function timeAgo(ts: number): string {
  const seconds = Math.max(1, Math.round((Date.now() - ts) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  return `${weeks}w ago`
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const user = useUser<AuthUser>()
  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [sent, setSent] = useState<SentRow[]>([])
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [signature, setSignature] = useState<string>(() => loadPreferences().signature)

  useEffect(() => {
    const handler = () => setSignature(loadPreferences().signature)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    }
    return undefined
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [draftsResp, sentResp, templatesResp, contactsResp] = await Promise.all([
          http.get<DraftRow[] | { data: DraftRow[] }>('/drafts'),
          http.get<SentRow[] | { data: SentRow[] }>('/sent-emails'),
          http.get<TemplateRow[] | { data: TemplateRow[] }>('/templates'),
          http.get<ContactRow[] | { data: ContactRow[] }>('/contacts').catch(() => ({ data: [] })),
        ])
        if (cancelled) return
        setDrafts(Array.isArray(draftsResp.data) ? draftsResp.data : (draftsResp.data.data ?? []))
        setSent(Array.isArray(sentResp.data) ? sentResp.data : (sentResp.data.data ?? []))
        setTemplates(
          Array.isArray(templatesResp.data) ? templatesResp.data : (templatesResp.data.data ?? []),
        )
        setContacts(
          Array.isArray(contactsResp.data) ? contactsResp.data : (contactsResp.data.data ?? []),
        )
      } catch (_error) {
        // Profile shouldn't break if any single resource fails — leave arrays empty.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  const displayName = user?.name?.trim() || (user?.email ?? '').split('@')[0] || ''
  const displayEmail = user?.email ?? ''
  const initials = initialsFor(displayName, displayEmail)
  const bio =
    user?.bio?.trim() ||
    t(
      'profile.bioDefault',
      { app: APP_NAME },
      { defaultValue: `Composing thoughtful emails with ${APP_NAME} — your AI writing partner.` },
    )

  const activity = useMemo<ActivityEntry[]>(() => {
    const entries: ActivityEntry[] = []
    for (const s of sent) {
      const ts = new Date(s.updated_at ?? s.created_at ?? 0).getTime()
      if (!ts) continue
      entries.push({
        key: `sent-${s.id}`,
        label: t(
          'profile.activity.sent',
          { email: s.recipient_email },
          { defaultValue: 'Sent an email to {{email}}' },
        ),
        when: timeAgo(ts),
        icon: 'send',
        tint: 'bg-primary/10 text-primary',
        ts,
      })
    }
    for (const d of drafts.filter((d) => d.status === 'draft')) {
      const ts = new Date(d.updated_at ?? d.created_at ?? 0).getTime()
      if (!ts) continue
      entries.push({
        key: `draft-${d.id}`,
        label: t(
          'profile.activity.draft',
          { subject: d.subject || t('profile.untitled', {}, { defaultValue: '(no subject)' }) },
          { defaultValue: 'Drafted “{{subject}}”' },
        ),
        when: timeAgo(ts),
        icon: 'drafts',
        tint: 'bg-secondary/15 text-secondary-dark',
        ts,
      })
    }
    for (const tpl of templates) {
      const ts = new Date(tpl.updated_at ?? tpl.created_at ?? 0).getTime()
      if (!ts) continue
      entries.push({
        key: `tpl-${tpl.id}`,
        label: t(
          'profile.activity.template',
          { name: tpl.name },
          { defaultValue: 'Saved template “{{name}}”' },
        ),
        when: timeAgo(ts),
        icon: 'dashboard_customize',
        tint: 'bg-tertiary/15 text-tertiary',
        ts,
      })
    }
    return entries.sort((a, b) => b.ts - a.ts).slice(0, 6)
  }, [drafts, sent, t, templates])

  return (
    <div
      data-mol-id="profile-page"
      className={cm.cn('px-4 py-6 md:px-8 md:py-8', cm.maxW('5xl'), 'mx-auto', cm.stack(8))}
    >
      <section
        data-mol-id="profile-hero"
        className={cm.cn(
          cm.sp('p', 8),
          cm.flex({ align: 'center', gap: 'xl', wrap: 'wrap' }),
          'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40 relative overflow-hidden',
        )}
      >
        <div
          className={cm.cn('absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl')}
          style={{ background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
          aria-hidden="true"
        />
        <div
          data-mol-id="profile-avatar"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-28 h-28 rounded-full text-white text-4xl font-extrabold tracking-tight relative z-10',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
            boxShadow: '0 16px 48px color-mix(in srgb, var(--color-primary) 32%, transparent)',
          }}
        >
          {initials}
        </div>
        <div className={cm.cn('flex-1 min-w-0 relative z-10')}>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary mb-1')}
          >
            {t('profile.eyebrow', {}, { defaultValue: 'Public profile' })}
          </p>
          <h1
            data-mol-id="profile-name"
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tighter')}
          >
            {displayName || t('profile.unnamedUser', {}, { defaultValue: 'Anonymous user' })}
          </h1>
          {displayEmail && (
            <p
              data-mol-id="profile-email"
              className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}
            >
              {displayEmail}
            </p>
          )}
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.sp('mt', 2),
              'text-on-surface-variant leading-relaxed max-w-2xl',
            )}
            style={{ fontFamily: 'Newsreader, Georgia, serif' }}
          >
            {bio}
          </p>
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), 'font-bold tracking-tight')}>
          {t('profile.toneProfileHeading', {}, { defaultValue: 'Tone profile' })}
        </h2>
        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
          {TONE_CHIPS.map((chip) => (
            <span
              key={chip.tone}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-surface-container-low border border-outline-variant/40',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base', chip.tint)}
                aria-hidden="true"
              >
                {chip.icon}
              </span>
              {t(`profile.toneChip.${chip.tone}`, {}, { defaultValue: chip.defaultLabel })}
            </span>
          ))}
        </div>
      </section>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-2')}>
        <section
          data-mol-id="profile-signature-section"
          className={cm.cn(
            cm.sp('p', 8),
            'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.sp('mb', 4), 'font-bold tracking-tight')}>
            {t('profile.signatureHeading', {}, { defaultValue: 'Signature preview' })}
          </h2>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl bg-surface-container-low border-l-2 border-secondary',
            )}
          >
            <pre
              data-mol-id="profile-signature"
              className={cm.cn(
                cm.textSize('sm'),
                'whitespace-pre-wrap text-on-surface leading-relaxed',
              )}
              style={{ fontFamily: 'Newsreader, Georgia, serif' }}
            >
              {signature ||
                t(
                  'profile.signatureEmpty',
                  {},
                  { defaultValue: '— No signature set in Settings —' },
                )}
            </pre>
          </div>
        </section>

        <section
          data-mol-id="profile-activity-section"
          className={cm.cn(
            cm.sp('p', 8),
            'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.sp('mb', 4), 'font-bold tracking-tight')}>
            {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
          </h2>
          {activity.length === 0 ? (
            <p
              data-mol-id="profile-activity-empty"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t(
                'profile.activityEmpty',
                {},
                { defaultValue: 'Your recent sends, drafts, and templates will appear here.' },
              )}
            </p>
          ) : (
            <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-3')}>
              {activity.map((row) => (
                <li
                  key={row.key}
                  data-mol-id="profile-activity-row"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(8),
                      cm.h(8),
                      cm.roundedFull,
                      row.tint,
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      {row.icon}
                    </span>
                  </span>
                  <p className={cm.cn('flex-1 text-sm font-semibold text-on-surface')}>
                    {row.label}
                  </p>
                  <span className={cm.cn('text-xs text-on-surface-variant tabular-nums')}>
                    {row.when}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section
        data-mol-id="profile-connected-section"
        className={cm.cn(
          cm.sp('p', 8),
          'bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.sp('mb', 4), 'font-bold tracking-tight')}>
          {t('profile.connectedHeading', {}, { defaultValue: 'Account at a glance' })}
        </h2>
        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
          {displayEmail && (
            <StatusPill
              status="sent"
              label={t(
                'profile.account.email',
                { email: displayEmail },
                { defaultValue: 'Email · {{email}}' },
              )}
              icon="mail"
            />
          )}
          <StatusPill
            status="ai-generated"
            label={t(
              'profile.account.contacts',
              { count: contacts.length },
              { defaultValue: '{{count}} contact(s)' },
            )}
            icon="group"
          />
          <StatusPill
            status="delivered"
            label={t(
              'profile.account.templates',
              { count: templates.length },
              { defaultValue: '{{count}} template(s)' },
            )}
            icon="dashboard_customize"
          />
        </div>
      </section>
    </div>
  )
}

export default Profile
export { Profile as ProfilePage }
