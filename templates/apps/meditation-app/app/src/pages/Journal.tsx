import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import type { I18nProvider } from '@molecule/app-i18n'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StillpointTopBar } from '../components/StillpointTopBar.js'
import type { ApiJournalEntry, ApiSession } from '../lib/api.js'

type Mood = 1 | 2 | 3 | 4 | 5

const MOOD_PALETTE: Record<Mood, { emoji: string; label: string; tone: string }> = {
  1: { emoji: '🌧️', label: 'Tense', tone: 'bg-error-container text-on-error-container' },
  2: { emoji: '☁️', label: 'Off', tone: 'bg-warning-container text-on-warning-container' },
  3: { emoji: '🌤️', label: 'Steady', tone: 'bg-secondary-container text-on-secondary-container' },
  4: { emoji: '🌿', label: 'Calm', tone: 'bg-primary-container text-on-primary-container' },
  5: { emoji: '✨', label: 'Bright', tone: 'bg-accent-container text-on-accent-container' },
}

function formatRelative(iso: string, t: I18nProvider['t']): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return t('common.relative.justNow', {}, { defaultValue: 'just now' })
  if (diff < 3600)
    return t(
      'common.relative.minutesShort',
      { count: Math.floor(diff / 60) },
      { defaultValue: '{{count}}m' },
    )
  if (diff < 86400)
    return t(
      'common.relative.hoursShort',
      { count: Math.floor(diff / 3600) },
      { defaultValue: '{{count}}h' },
    )
  if (diff < 86400 * 7)
    return t(
      'common.relative.daysShort',
      { count: Math.floor(diff / 86400) },
      { defaultValue: '{{count}}d' },
    )
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Journal() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [entries, setEntries] = useState<ApiJournalEntry[]>([])
  const [sessions, setSessions] = useState<Map<string, ApiSession>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [draft, setDraft] = useState('')
  const [draftMood, setDraftMood] = useState<Mood>(4)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const loadEntries = async () => {
    setLoading(true)
    try {
      const res = await http.get<ApiJournalEntry[]>('/journal?limit=50')
      const list = Array.isArray(res.data) ? res.data : []
      setEntries(list)
      setError(null)
      const sessionIds = Array.from(
        new Set(list.map((e) => e.session_id).filter((s): s is string => Boolean(s))),
      )
      if (sessionIds.length > 0) {
        const fetched = await Promise.all(
          sessionIds.map((id) =>
            http
              .get<ApiSession>(`/sessions/${id}`)
              .then((r) => r.data)
              .catch(() => null),
          ),
        )
        const map = new Map<string, ApiSession>()
        for (const s of fetched) if (s?.id) map.set(s.id, s)
        setSessions(map)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const handleSave = async () => {
    const body = draft.trim()
    if (body.length === 0 || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await http.post('/journal', {
        body,
        mood: draftMood,
        written_at: new Date().toISOString(),
      })
      void track({ name: 'journal.created', properties: { mood: draftMood, length: body.length } })
      setDraft('')
      setDraftMood(4)
      await loadEntries()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.written_at).getTime() - new Date(a.written_at).getTime(),
      ),
    [entries],
  )

  return (
    <>
      <StillpointTopBar
        title={t('stillpoint.journal.heading', {}, { defaultValue: 'Journal' })}
        eyebrow={
          <span data-testid="journal-eyebrow">
            {t('stillpoint.journal.eyebrow', {}, { defaultValue: 'Notice. Note. Let it pass.' })}
          </span>
        }
      />

      <section
        data-testid="journal-compose"
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline/30',
        )}
      >
        <h2 className={cm.cn(cm.fontWeight('bold'), 'text-lg text-on-surface tracking-tight')}>
          {t('stillpoint.journal.todayHeading', {}, { defaultValue: 'How was your practice?' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {([1, 2, 3, 4, 5] as const).map((m) => {
            const palette = MOOD_PALETTE[m]
            const active = draftMood === m
            return (
              <button
                key={m}
                type="button"
                data-testid={`journal-mood-${m}`}
                onClick={() => setDraftMood(m)}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full transition-all',
                  active
                    ? palette.tone
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant',
                )}
              >
                <span aria-hidden="true">{palette.emoji}</span>
                {t(`stillpoint.journal.mood.${m}`, {}, { defaultValue: palette.label })}
              </button>
            )
          })}
        </div>
        <textarea
          data-testid="journal-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder={t(
            'stillpoint.journal.placeholder',
            {},
            { defaultValue: 'A breath, a note, a moment...' },
          )}
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('base'),
            'w-full bg-surface rounded-xl border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors text-on-surface placeholder:text-on-surface-variant resize-y',
          )}
        />
        {saveError ? (
          <p data-testid="journal-save-error" className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {saveError}
          </p>
        ) : null}
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'stillpoint.journal.privacy',
              {},
              { defaultValue: 'Saved privately to your account.' },
            )}
          </span>
          <button
            type="button"
            data-testid="journal-save"
            onClick={() => void handleSave()}
            disabled={draft.trim().length === 0 || saving}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('stillpoint.journal.save', {}, { defaultValue: 'Save reflection' })}
          </button>
        </div>
      </section>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <h2 className={cm.cn(cm.fontWeight('bold'), 'text-lg text-on-surface tracking-tight')}>
          {t('stillpoint.journal.recentHeading', {}, { defaultValue: 'Recent reflections' })}
        </h2>
        {error ? (
          <div
            data-testid="journal-error"
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl border border-error text-error')}
          >
            {t(
              'stillpoint.journal.loadError',
              {},
              { defaultValue: "We couldn't load your reflections." },
            )}
          </div>
        ) : loading ? (
          <div
            data-testid="journal-loading"
            className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant')}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </div>
        ) : sortedEntries.length === 0 ? (
          <div
            data-testid="journal-empty"
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              'rounded-2xl border border-dashed border-outline text-on-surface-variant',
            )}
          >
            {t(
              'stillpoint.journal.empty',
              {},
              { defaultValue: 'No reflections yet — save your first one above.' },
            )}
          </div>
        ) : (
          <ul
            data-testid="journal-list"
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'list-none')}
          >
            {sortedEntries.map((entry) => {
              const mood = (entry.mood ?? 3) as Mood
              const palette = MOOD_PALETTE[mood] ?? MOOD_PALETTE[3]
              const session = entry.session_id ? sessions.get(entry.session_id) : null
              return (
                <li
                  key={entry.id}
                  data-testid={`journal-entry-${entry.id}`}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    cm.sp('p', 5),
                    'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline/20 hover:shadow-md transition-shadow',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'rounded-full uppercase tracking-widest',
                          palette.tone,
                        )}
                      >
                        <span aria-hidden="true">{palette.emoji}</span>
                        {t(`stillpoint.journal.mood.${mood}`, {}, { defaultValue: palette.label })}
                      </span>
                      {session ? (
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {session.title}
                        </span>
                      ) : entry.title ? (
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {entry.title}
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant uppercase tracking-widest',
                      )}
                    >
                      {formatRelative(entry.written_at, t)}
                    </span>
                  </div>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-on-surface-variant leading-relaxed whitespace-pre-wrap',
                    )}
                  >
                    {entry.body}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
