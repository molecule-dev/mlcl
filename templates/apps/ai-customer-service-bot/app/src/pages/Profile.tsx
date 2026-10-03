import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { get, put } from '@molecule/app-http'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ConfidenceMeter } from '../components/ConfidenceMeter.js'
import { RapportLayout } from '../components/RapportLayout.js'
import { StatusBadge } from '../components/StatusBadge.js'

interface SettingsRow {
  id: string
  user_id: string
  bot_tone: string
  auto_escalate: boolean
  greeting: string
  signature: string
  notify_escalations: boolean
  notify_mentions: boolean
  notify_digest: boolean
  quiet_hours: boolean
}

interface AnalyticsResponse {
  summary: {
    totalConversations: number
    resolvedConversations: number
    escalatedConversations: number
    averageCsat: number
    helpfulRate: number
  }
}

function initialsOf(value: string | undefined): string {
  if (!value) return '?'
  return (
    value
      .split(/\s+/)
      .map((s) => s[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [routingTopics, setRoutingTopics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [s, a] = await Promise.all([
        get<SettingsRow>('/api/settings'),
        get<AnalyticsResponse>('/api/analytics').catch(() => ({ data: null })),
      ])
      setSettings(s.data ?? null)
      setAnalytics(a.data ?? null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('profile.loadError', {}, { defaultValue: 'Failed to load profile' }),
      )
    } finally {
      setLoading(false)
    }
    // Routing topics are secondary content: the distinct knowledge-base
    // categories this workspace's bot answers and routes by. A failed fetch
    // just leaves the section empty — never the page-level error state.
    try {
      const k = await get<{ category: string }>('/api/knowledge')
      const rows = Array.isArray(k.data) ? k.data : []
      setRoutingTopics(
        [...new Set(rows.map((r) => r.category).filter((c): c is string => Boolean(c)))].sort(),
      )
    } catch (_error) {
      // Intentional noop: a failed fetch just leaves the section empty.
      setRoutingTopics([])
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function patch(field: keyof SettingsRow, value: unknown) {
    if (!settings) return
    setSettings({ ...settings, [field]: value } as SettingsRow)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    setError(null)
    try {
      await put('/api/settings', {
        signature: settings.signature,
        notify_escalations: settings.notify_escalations,
        notify_mentions: settings.notify_mentions,
        notify_digest: settings.notify_digest,
      })
      setSavedMessage(t('profile.savedConfirm', {}, { defaultValue: 'Profile saved' }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('profile.saveError', {}, { defaultValue: 'Failed to save profile' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const displayName = user?.name ?? user?.email ?? t('nav.you', {}, { defaultValue: 'You' })
  const displayEmail = user?.email ?? ''
  const initials = initialsOf(displayName === '?' ? user?.email : displayName)

  return (
    <RapportLayout>
      <div
        data-mol-id="page-profile"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 6 }),
          cm.sp('p', 8),
          'rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)] relative overflow-hidden',
        )}
      >
        <div
          aria-hidden="true"
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl pointer-events-none"
        />
        <div
          data-mol-id="profile-avatar"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(24),
            cm.h(24),
            cm.roundedFull,
            cm.fontWeight('bold'),
            'text-3xl bg-surface/20 backdrop-blur-md text-on-primary z-10 ring-4 ring-white/30',
          )}
        >
          {initials}
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }), 'z-10')}>
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              'text-[10px] tracking-widest uppercase text-on-primary/80',
            )}
          >
            {t('profile.yourProfile', {}, { defaultValue: 'Your profile' })}
          </span>
          <h1
            data-mol-id="profile-name"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-3xl md:text-4xl tracking-tight leading-tight',
            )}
          >
            {displayName}
          </h1>
          {displayEmail && (
            <span data-mol-id="profile-email" className="text-on-primary/80 text-sm">
              {displayEmail}
            </span>
          )}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mt', 1))}>
            <StatusBadge
              variant="active"
              label={t('profile.role.agent', {}, { defaultValue: 'Support agent' })}
            />
          </div>
        </div>
      </div>

      {savedMessage && (
        <div
          data-mol-id="profile-saved"
          role="status"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('p', 3),
            'rounded-lg bg-primary/10 text-primary text-sm',
          )}
        >
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{savedMessage}</span>
        </div>
      )}

      {error && (
        <div
          data-mol-id="profile-error"
          role="alert"
          className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-error/10 text-error text-sm')}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          data-mol-id="profile-loading"
          className={cm.cn(cm.textCenter, cm.sp('p', 8), 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'lg:grid-cols-12')}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 4 }),
              cm.sp('p', 6),
              'lg:col-span-8 rounded-2xl bg-surface-container-lowest shadow-sm',
            )}
            data-mol-id="profile-stats"
          >
            <h2
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('lg'),
                'text-on-surface tracking-tight',
              )}
            >
              {t('profile.performance', {}, { defaultValue: 'Your performance' })}
            </h2>
            <div className={cm.cn(cm.grid({ cols: 2, gap: 4 }), 'md:grid-cols-4')}>
              {[
                {
                  id: 'handled',
                  labelKey: 'profile.kpi.handled',
                  labelDefault: 'Threads handled',
                  value: String(analytics?.summary.totalConversations ?? 0),
                },
                {
                  id: 'csat',
                  labelKey: 'profile.kpi.csat',
                  labelDefault: 'Avg CSAT',
                  value: analytics?.summary.averageCsat
                    ? analytics.summary.averageCsat.toFixed(2)
                    : '—',
                },
                {
                  id: 'resolved',
                  labelKey: 'profile.kpi.resolved',
                  labelDefault: 'Resolved',
                  value: String(analytics?.summary.resolvedConversations ?? 0),
                },
                {
                  id: 'escalations',
                  labelKey: 'profile.kpi.escalations',
                  labelDefault: 'Escalations',
                  value: String(analytics?.summary.escalatedConversations ?? 0),
                },
              ].map((k) => (
                <div
                  key={k.id}
                  data-mol-id={`profile-kpi-${k.id}`}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 1 }),
                    cm.sp('p', 4),
                    'rounded-xl bg-surface-container-low',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] tracking-widest uppercase text-on-surface-variant',
                    )}
                  >
                    {t(k.labelKey, {}, { defaultValue: k.labelDefault })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-2xl tabular-nums tracking-tight text-on-surface',
                    )}
                  >
                    {k.value}
                  </span>
                </div>
              ))}
            </div>
            {analytics && (
              <div
                data-mol-id="profile-helpful"
                className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}
              >
                <span
                  className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'), 'text-on-surface')}
                >
                  {t('profile.helpfulRate', {}, { defaultValue: 'Helpful feedback rate' })}
                </span>
                <ConfidenceMeter
                  value={analytics.summary.helpfulRate}
                  hideValue
                  label={t('profile.helpfulSubtitle', {}, { defaultValue: 'thumbs-up share' })}
                />
              </div>
            )}
          </div>

          <div className={cm.cn(cm.flex({ direction: 'col', gap: 6 }), 'lg:col-span-4')}>
            <form
              data-mol-id="profile-prefs-form"
              onSubmit={handleSave}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 4 }),
                cm.sp('p', 5),
                'rounded-2xl bg-surface-container-lowest shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('base'),
                  'text-on-surface tracking-tight',
                )}
              >
                {t('profile.signatureTitle', {}, { defaultValue: 'Email signature' })}
              </h2>
              <textarea
                data-mol-id="profile-signature"
                rows={3}
                value={settings?.signature ?? ''}
                onChange={(e) => patch('signature', e.target.value)}
                placeholder={t(
                  'profile.signaturePlaceholder',
                  {},
                  { defaultValue: 'Your signature…' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none resize-none',
                )}
              />

              <h2
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('base'),
                  'text-on-surface tracking-tight mt-2',
                )}
              >
                {t('profile.notify', {}, { defaultValue: 'Notify me when…' })}
              </h2>
              <label
                data-mol-id="profile-notify-escalations-row"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('sm'),
                  'cursor-pointer text-on-surface',
                )}
              >
                <span>
                  {t(
                    'profile.notify.escalations',
                    {},
                    { defaultValue: 'A thread is escalated to me' },
                  )}
                </span>
                <input
                  data-mol-id="profile-notify-escalations"
                  type="checkbox"
                  checked={settings?.notify_escalations ?? false}
                  onChange={(e) => patch('notify_escalations', e.target.checked)}
                  className="h-5 w-5 accent-primary"
                />
              </label>
              <label
                data-mol-id="profile-notify-mentions-row"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('sm'),
                  'cursor-pointer text-on-surface',
                )}
              >
                <span>
                  {t('profile.notify.mentions', {}, { defaultValue: "I'm mentioned in a thread" })}
                </span>
                <input
                  data-mol-id="profile-notify-mentions"
                  type="checkbox"
                  checked={settings?.notify_mentions ?? false}
                  onChange={(e) => patch('notify_mentions', e.target.checked)}
                  className="h-5 w-5 accent-primary"
                />
              </label>
              <label
                data-mol-id="profile-notify-digest-row"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('sm'),
                  'cursor-pointer text-on-surface',
                )}
              >
                <span>
                  {t('profile.notify.digest', {}, { defaultValue: 'Weekly performance digest' })}
                </span>
                <input
                  data-mol-id="profile-notify-digest"
                  type="checkbox"
                  checked={settings?.notify_digest ?? false}
                  onChange={(e) => patch('notify_digest', e.target.checked)}
                  className="h-5 w-5 accent-primary"
                />
              </label>

              <button
                data-mol-id="profile-save"
                type="submit"
                disabled={saving || !settings}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-full bg-primary text-on-primary px-5 py-2 disabled:opacity-50 self-start',
                )}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
              </button>
            </form>

            <div
              data-mol-id="profile-skills"
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 3 }),
                cm.sp('p', 5),
                'rounded-2xl bg-surface-container-lowest shadow-sm',
              )}
            >
              <h2
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.fontWeight('semibold'),
                  cm.textSize('base'),
                  'text-on-surface tracking-tight',
                )}
              >
                <span className="material-symbols-outlined text-lg text-primary">
                  military_tech
                </span>
                {t('profile.skills.title', {}, { defaultValue: 'Skills & Routing' })}
              </h2>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'profile.skills.subtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Topics {{appName}} routes and answers, drawn from your knowledge base.',
                  },
                )}
              </p>
              {routingTopics.length === 0 ? (
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'profile.skills.empty',
                    {},
                    {
                      defaultValue:
                        'No routing topics yet — publish a knowledge article to define one.',
                    },
                  )}
                </p>
              ) : (
                <div className={cm.cn(cm.flex({ gap: 2 }), 'flex-wrap')}>
                  {routingTopics.map((topic) => (
                    <Link
                      key={topic}
                      data-mol-id={`profile-skill-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      to="/knowledge"
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 1 }),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'rounded-md border border-outline-variant/10 bg-surface-container px-2.5 py-1 text-on-surface hover:bg-surface-container-high transition-colors',
                      )}
                    >
                      {topic}
                      <span className="material-symbols-outlined text-sm text-primary">
                        arrow_outward
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </RapportLayout>
  )
}

export default Profile
export { Profile, Profile as ProfilePage }
