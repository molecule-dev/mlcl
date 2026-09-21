import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ProfileResponse {
  id?: string
  name?: string | null
  email?: string | null
}

function getGreetingKey(): { key: string; default: string } {
  const hour = new Date().getHours()
  if (hour < 12)
    return { key: 'dashboardWelcomeHeader.greeting', default: 'Good morning, {{name}}' }
  if (hour < 17)
    return { key: 'dashboardWelcomeHeader.greetingAfternoon', default: 'Good afternoon, {{name}}' }
  return { key: 'dashboardWelcomeHeader.greetingEvening', default: 'Good evening, {{name}}' }
}

function pickDisplayName(profile: ProfileResponse | null, fallback: string): string {
  const trimmedName = profile?.name?.trim()
  if (trimmedName) {
    const first = trimmedName.split(/\s+/)[0]
    return first || trimmedName
  }
  const email = profile?.email?.trim()
  if (email) {
    const handle = email.split('@')[0]
    if (handle) return handle
    return email
  }
  return fallback
}

function DashboardWelcomeHeader() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { user } = useAuth<{ id?: string; email?: string; name?: string }>()
  const http = useHttpClient()
  const [profile, setProfile] = useState<ProfileResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ProfileResponse>(`/api/profile/me`)
      .then((res) => {
        if (cancelled) return
        const payload = res.data
        setProfile(payload ?? null)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [http, user])

  const fallback = t('dashboardWelcomeHeader.guest', {}, { defaultValue: 'there' })
  const name = pickDisplayName(
    profile ?? { name: user?.name ?? null, email: user?.email ?? null },
    fallback,
  )
  const greeting = getGreetingKey()

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', align: 'start', gap: 'md' }),
        'asymmetric-layout md:flex-row',
      )}
    >
      <div className={cm.cn(cm.maxW('2xl'), 'min-w-0')}>
        <h1
          className={cm.cn(
            'text-3xl md:text-5xl [overflow-wrap:anywhere]',
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'font-headline tracking-tight text-on-background',
          )}
          data-mol-id="dashboard-welcome-greeting"
        >
          {t(greeting.key, { name }, { defaultValue: greeting.default })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant font-body')}>
          {t(
            'dashboardWelcomeHeader.overviewSubtitle',
            {},
            {
              defaultValue:
                "Here's your content overview at a glance — start writing or jump back into a draft.",
            },
          )}
        </p>
      </div>
    </section>
  )
}

export default DashboardWelcomeHeader
export { DashboardWelcomeHeader }
