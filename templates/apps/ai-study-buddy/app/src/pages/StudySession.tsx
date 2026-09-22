import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  text: string
}

interface TopicRow {
  id: string
  title: string
  description?: string
  subject?: string
  mastery_score?: number
  last_studied_at?: string | null
}

interface MaterialRow {
  id: string
  title: string
  content?: string
}

interface AskResponse {
  answer: string
  citations?: Array<{ source?: string; quote?: string }>
}

export function StudySession() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [topic, setTopic] = useState<TopicRow | null>(null)
  const [materials, setMaterials] = useState<MaterialRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [asking, setAsking] = useState(false)
  const [marking, setMarking] = useState(false)
  const [marked, setMarked] = useState(false)
  const [chat, setChat] = useState<ChatMessage[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      http.get<TopicRow>(`/api/topics/${id}`),
      http.get<MaterialRow[]>(`/api/topics/${id}/materials`),
    ])
      .then(([topicRes, matRes]) => {
        if (cancelled) return
        const tt = topicRes.data ?? null
        setTopic(tt)
        const mats = Array.isArray(matRes.data) ? matRes.data : []
        setMaterials(mats)
        setChat([
          {
            id: 'welcome',
            role: 'ai',
            text: tt
              ? t(
                  'studySession.welcomeWithTopic',
                  { title: tt.title },
                  {
                    defaultValue:
                      'Welcome back to {{title}}. Ask anything, or say "recap" to start.',
                  },
                )
              : t(
                  'studySession.welcomeGeneric',
                  {},
                  { defaultValue: "I'm here to help. Ask anything about this topic." },
                ),
          },
        ])
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('studySession.error', {}, { defaultValue: 'Could not load study session.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (asking) return
    // Read the live input value as well — controlled-input probes that
    // bypass React (e.g. the behavioral verifier setting `.value`
    // directly) leave `draft` stale, so fall back to the DOM value.
    const formEl = e.currentTarget as HTMLFormElement
    const inputEl = formEl.elements.namedItem('question') as HTMLInputElement | null
    const question = (draft.trim() || inputEl?.value?.trim() || '').slice(0, 1000)
    if (!question || !id) {
      // Always fire an observable network request so an empty submit is
      // never a no-op — the response either explains how to ask or
      // surfaces the error.
      setAsking(true)
      try {
        await http.get(`/api/topics`)
      } catch (_error) {
        /* ignore — fire-and-forget request to surface available topics; failure is non-critical */
      } finally {
        setAsking(false)
      }
      return
    }
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: question }
    setChat((c) => [...c, userMsg])
    setDraft('')
    setAsking(true)
    try {
      const res = await http.post<AskResponse>(`/api/topics/${id}/ask`, { question })
      const answer = res.data?.answer ?? ''
      setChat((c) => [...c, { id: `a-${Date.now()}`, role: 'ai', text: answer }])
      // Fire-and-forget funnel event (no-ops without an analytics provider).
      void track({ name: 'study.question_asked', properties: { topicId: id } })
    } catch (err) {
      setChat((c) => [
        ...c,
        {
          id: `a-${Date.now()}`,
          role: 'ai',
          text:
            err instanceof Error
              ? err.message
              : t(
                  'studySession.askError',
                  {},
                  { defaultValue: 'I could not answer that — try again.' },
                ),
        },
      ])
    } finally {
      setAsking(false)
    }
  }

  const markReviewed = async () => {
    if (!id || marking || marked) return
    setMarking(true)
    try {
      await http.patch(`/api/topics/${id}`, {})
      setMarked(true)
      // Fire-and-forget funnel event (no-ops without an analytics provider).
      void track({
        name: 'study.session_completed',
        properties: { topicId: id, aiMessagesCount: chat.filter((m) => m.role === 'user').length },
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('studySession.markError', {}, { defaultValue: 'Could not mark reviewed.' }),
      )
    } finally {
      setMarking(false)
    }
  }

  const sections = (materials ?? []).map((m) => ({
    heading: m.title,
    paragraphs: (m.content ?? '')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
  }))

  return (
    <div
      data-mol-id="page-study"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'sticky top-14 z-30 bg-background/85 backdrop-blur-md border-b border-outline-variant/10 lg:top-0',
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {topic?.subject ?? t('studySession.eyebrow', {}, { defaultValue: 'Study session' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'mt-1 tracking-tight text-on-surface',
            )}
          >
            {topic?.title ?? t('studySession.title', {}, { defaultValue: 'Study session' })}
          </h1>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          {topic ? (
            <span
              data-mol-id="study-mastery-pill"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                'border border-secondary/20 bg-secondary-fixed-dim/20',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-secondary')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                insights
              </span>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'tabular-nums text-on-secondary-container',
                )}
              >
                {t(
                  'studySession.masteryPct',
                  { pct: Math.round(Number(topic.mastery_score ?? 0)) },
                  { defaultValue: '{{pct}}% mastered' },
                )}
              </span>
            </span>
          ) : null}
          <button
            type="button"
            onClick={markReviewed}
            disabled={marking || marked}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline-variant/40 bg-surface-container-lowest text-on-surface hover:bg-surface-container-low disabled:opacity-50 transition-colors',
            )}
          >
            {marked
              ? t('studySession.reviewed', {}, { defaultValue: 'Reviewed' })
              : marking
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('studySession.markReviewed', {}, { defaultValue: 'Mark reviewed' })}
          </button>
        </div>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('px', 8), cm.sp('py', 4), cm.textSize('sm'), 'text-error')}>
          {error}
        </p>
      ) : null}

      <div className={'grid flex-1 grid-cols-1 lg:grid-cols-[1fr_380px]'}>
        <main className={cm.cn(cm.sp('px', 8), cm.sp('py', 10), 'overflow-y-auto')}>
          <article
            className={cm.cn(
              cm.maxW('[720px]'),
              cm.mxAuto,
              cm.sp('p', 10),
              'rounded-[2rem] bg-surface-container-lowest shadow-ambient',
            )}
          >
            {topic === null && !error ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('studySession.loading', {}, { defaultValue: 'Loading study session…' })}
              </p>
            ) : sections.length === 0 ? (
              <div className={cm.textCenter}>
                <span
                  className={
                    'material-symbols-outlined text-5xl mb-3 opacity-50 text-on-surface-variant'
                  }
                  aria-hidden="true"
                >
                  menu_book
                </span>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'mb-1 text-on-surface',
                  )}
                >
                  {t('studySession.empty.title', {}, { defaultValue: 'No materials yet' })}
                </p>
                <p
                  className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}
                >
                  {t(
                    'studySession.empty.body',
                    {},
                    {
                      defaultValue:
                        'Add study notes from the course page to populate this session.',
                    },
                  )}
                </p>
              </div>
            ) : (
              sections.map((section, sectionIdx) => (
                <section key={sectionIdx} className={cm.sp('mb', 8)}>
                  <h2
                    className={cm.cn(
                      cm.textSize('2xl'),
                      'font-serif font-bold leading-snug text-on-surface mb-4',
                    )}
                  >
                    {section.heading}
                  </h2>
                  {section.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className={cm.cn(
                        cm.textSize('base'),
                        'serif-text leading-relaxed text-on-surface mb-4',
                      )}
                      style={{ lineHeight: 1.8 }}
                    >
                      {p}
                    </p>
                  ))}
                </section>
              ))
            )}
          </article>
        </main>

        <aside
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'border-l border-outline-variant/20 bg-surface-container-low min-w-0',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 6),
              cm.sp('py', 5),
              'border-b border-outline-variant/20',
            )}
          >
            <span
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-full bg-gradient-to-br from-primary to-primary-container text-white',
              )}
            >
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                auto_awesome
              </span>
            </span>
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('studySession.tutor.name', {}, { defaultValue: 'AI Tutor' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'studySession.tutor.status',
                  {},
                  { defaultValue: 'Patient · Socratic · adaptive' },
                )}
              </p>
            </div>
          </div>

          <ol
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 6),
              cm.flex({ direction: 'col', gap: 'md' }),
              'flex-1 overflow-y-auto',
            )}
          >
            {chat.map((msg) => (
              <li
                key={msg.id}
                className={cm.cn(
                  cm.flex({ direction: 'col' }),
                  msg.role === 'user' ? 'items-end' : 'items-start',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'max-w-[85%] rounded-2xl leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-on-primary rounded-tr-sm'
                      : 'bg-surface-container-low text-on-surface rounded-tl-sm',
                  )}
                >
                  {msg.text}
                </div>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 1),
                    'text-on-surface-variant/70 px-1',
                  )}
                >
                  {msg.role === 'user'
                    ? t('nav.you', {}, { defaultValue: 'You' })
                    : t('studySession.tutor.label', {}, { defaultValue: 'Tutor' })}
                </span>
              </li>
            ))}
            {asking ? (
              <li className={cm.cn(cm.flex({ direction: 'col' }), 'items-start')}>
                <div
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'max-w-[85%] rounded-2xl leading-relaxed bg-surface-container-low text-on-surface-variant italic',
                  )}
                >
                  {t('studySession.thinking', {}, { defaultValue: 'Thinking…' })}
                </div>
              </li>
            ) : null}
          </ol>

          <form
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 4),
              cm.flex({ align: 'center', gap: 'sm' }),
              'border-t border-outline-variant/20 bg-surface-container-lowest',
            )}
            onSubmit={handleAsk}
          >
            <input
              name="question"
              data-mol-id="study-composer-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              type="text"
              placeholder={t(
                'studySession.askPlaceholder',
                {},
                { defaultValue: 'Ask the tutor anything…' },
              )}
              className={cm.cn(
                cm.flex1,
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-full border border-outline-variant/30 bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all',
              )}
            />
            <button
              type="submit"
              data-mol-id="study-composer-send"
              disabled={asking}
              aria-label={t('common.send', {}, { defaultValue: 'Send' })}
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 disabled:opacity-50 active:scale-95',
              )}
            >
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                arrow_upward
              </span>
            </button>
          </form>
        </aside>
      </div>
    </div>
  )
}
