import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface StreakResponse {
  streakDays?: number
  wordsThisWindow?: number
  windowDays?: number
  activeDays?: number
}

function compactNumber(value: number): string {
  if (value < 1000) return String(value)
  if (value < 1_000_000) {
    const k = value / 1000
    return (k >= 10 ? Math.round(k) : Number(k.toFixed(1))) + 'k'
  }
  const m = value / 1_000_000
  return (m >= 10 ? Math.round(m) : Number(m.toFixed(1))) + 'm'
}

function EditorStreakCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [streak, setStreak] = useState<StreakResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<StreakResponse>('/api/analytics/streak?windowDays=7')
      .then((res) => {
        if (cancelled) return
        const payload = res.data
        setStreak(payload ?? {})
      })
      .catch(() => {
        if (cancelled) return
        setStreak({})
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const streakDays = streak?.streakDays ?? 0
  const wordsThisWindow = streak?.wordsThisWindow ?? 0

  const headlineKey =
    streakDays > 0 ? 'editorStreakCard.streakMessage' : 'editorStreakCard.noStreakYet'
  const headlineDefault =
    streakDays > 0
      ? "You've written {{days}} day(s) in a row — keep it up!"
      : 'Start a streak today by publishing or drafting a post.'

  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        'bg-tertiary-fixed rounded-xl editorial-shadow relative overflow-hidden group',
      )}
      data-mol-id="editor-streak-card"
    >
      <div className={cm.fv7a8ff926}>
        <h3
          className={cm.cn(
            cm.textSize('lg'),
            cm.sp('mb', 2),
            'text-on-tertiary-fixed font-headline font-extrabold',
          )}
        >
          {t('editorStreakCard.title', {}, { defaultValue: "Editor's Streak" })}
        </h3>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-tertiary-fixed/70')}
          data-mol-id="editor-streak-message"
        >
          {t(headlineKey, { days: streakDays }, { defaultValue: headlineDefault })}
        </p>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(cm.textSize('3xl'), 'font-black text-tertiary')}
            data-mol-id="editor-streak-words"
          >
            {compactNumber(wordsThisWindow)}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-tertiary-fixed uppercase tracking-widest',
            )}
          >
            {t('editorStreakCard.wordsThisWeek', {}, { defaultValue: 'Words this week' })}
          </span>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.w(40),
          cm.h(40),
          cm.roundedFull,
          'absolute -right-10 -bottom-10 bg-tertiary/20 blur-3xl group-hover:scale-150 transition-transform duration-700',
        )}
      ></div>
    </div>
  )
}

export default EditorStreakCard
export { EditorStreakCard }
