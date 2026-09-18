import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface QuizRow {
  id: string
  title: string
  description?: string | null
  category?: string | null
  status: string
  time_per_question_s?: number
  scoring_mode?: 'speed' | 'flat'
}

interface QuestionRow {
  id: string
  prompt: string
  type: string
  choices: string[] | string | null
  correct_answer: string
  points: number
  time_limit_s: number
  position: number
}

const KEYS = ['A', 'B', 'C', 'D'] as const
type AnswerKey = (typeof KEYS)[number]

const ANSWER_PALETTE: Record<AnswerKey, string> = {
  A: 'bg-rose-500/10 border-rose-300 text-error',
  B: 'bg-blue-500/10 border-blue-300 text-blue-500',
  C: 'bg-amber-500/10 border-amber-300 text-warning',
  D: 'bg-emerald-500/10 border-emerald-300 text-success',
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

function parseChoices(raw: QuestionRow['choices']): string[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      // Invalid JSON stored in DB; fall back to empty choices array
      return []
    }
  }
  return []
}

function blankChoices(): string[] {
  return ['', '', '', '']
}

export function QuizBuilder() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id: quizId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [quiz, setQuiz] = useState<QuizRow | null>(null)
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [savingTitle, setSavingTitle] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!quizId) return
    setLoading(true)
    try {
      const [qRes, questionsRes] = await Promise.all([
        http.get(`/api/quizzes/${quizId}`),
        http.get(`/api/questions/quiz/${quizId}`),
      ])
      const loadedQuiz = unwrap<QuizRow>(qRes)
      const loadedQuestions = unwrap<QuestionRow[]>(questionsRes) ?? []
      if (!loadedQuiz) {
        setError(t('quizBuilder.notFound', {}, { defaultValue: 'Quiz not found.' }))
        return
      }
      setQuiz(loadedQuiz)
      setTitle(loadedQuiz.title)
      setQuestions(loadedQuestions)
      if (loadedQuestions.length > 0 && !activeId) {
        setActiveId(loadedQuestions[0]!.id)
      }
    } catch (err) {
      setError(t('quizBuilder.loadError', {}, { defaultValue: 'Could not load quiz.' }))
      console.error(err)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, quizId, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
        {t('quizBuilder.loading', {}, { defaultValue: 'Loading editor…' })}
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className={cm.cn(cm.sp('py', 12), cm.textCenter)}>
        <p className={cm.cn('text-base font-bold mb-4')}>{error}</p>
        <button
          type="button"
          onClick={() => navigate('/my-quizzes')}
          className={cm.cn(
            'px-5 py-2 rounded-xl bg-primary text-white text-xs font-extrabold uppercase tracking-widest',
          )}
        >
          {t('quizBuilder.back', {}, { defaultValue: 'Back to my quizzes' })}
        </button>
      </div>
    )
  }

  const active = questions.find((q) => q.id === activeId) ?? questions[0] ?? null

  async function saveTitle() {
    if (!quiz || title === quiz.title) return
    setSavingTitle(true)
    try {
      await http.put(`/api/quizzes/${quiz.id}`, { title })
      setQuiz({ ...quiz, title })
    } finally {
      setSavingTitle(false)
    }
  }

  async function patchQuestion(
    id: string,
    patch: Partial<QuestionRow> & { choicesArray?: string[] },
  ) {
    setSavingQuestion(id)
    try {
      const body: Record<string, unknown> = { ...patch }
      if (patch.choicesArray) {
        body.choices = patch.choicesArray
        delete body.choicesArray
      }
      const res = await http.put(`/api/questions/${id}`, body)
      const updated = unwrap<QuestionRow>(res)
      if (updated) {
        setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...updated } : q)))
      }
    } finally {
      setSavingQuestion(null)
    }
  }

  function updateChoice(id: string, idx: number, value: string) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== id) return q
        const choices = parseChoices(q.choices)
        while (choices.length < 4) choices.push('')
        choices[idx] = value
        return { ...q, choices }
      }),
    )
  }

  function commitChoices(id: string) {
    const target = questions.find((q) => q.id === id)
    if (!target) return
    const choices = parseChoices(target.choices)
    void patchQuestion(id, { choicesArray: choices })
  }

  function setCorrect(id: string, value: string) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, correct_answer: value } : q)))
    void patchQuestion(id, { correct_answer: value })
  }

  function setPrompt(id: string, value: string) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, prompt: value } : q)))
  }

  function commitPrompt(id: string) {
    const target = questions.find((q) => q.id === id)
    if (target) void patchQuestion(id, { prompt: target.prompt })
  }

  async function addQuestion() {
    if (!quiz) return
    const choices = blankChoices()
    const res = await http.post('/api/questions', {
      quiz_id: quiz.id,
      prompt: 'New question',
      type: 'multiple-choice',
      choices,
      correct_answer: '',
      points: 1000,
      time_limit_s: 20,
      position: questions.length,
    })
    const created = unwrap<QuestionRow>(res)
    if (created) {
      setQuestions((qs) => [...qs, created])
      setActiveId(created.id)
    }
  }

  async function deleteQuestion(id: string) {
    await http.delete(`/api/questions/${id}`)
    setQuestions((qs) => qs.filter((q) => q.id !== id))
    if (activeId === id) {
      const remaining = questions.filter((q) => q.id !== id)
      setActiveId(remaining[0]?.id ?? '')
    }
  }

  async function publish() {
    if (!quiz) return
    setPublishing(true)
    setStatusMessage(null)
    try {
      const incomplete = questions.filter((q) => {
        const choices = parseChoices(q.choices).filter((c) => c.trim() !== '')
        return choices.length < 2 || !q.correct_answer || !choices.includes(q.correct_answer)
      })
      if (questions.length === 0 || incomplete.length > 0) {
        setStatusMessage(
          t(
            'quizBuilder.publishIncomplete',
            { count: incomplete.length },
            {
              defaultValue:
                'Add at least two answer choices and pick the correct one for {{count}} question(s) before publishing.',
            },
          ),
        )
        return
      }
      await http.post(`/api/quizzes/${quiz.id}/publish`, {})
      setQuiz({ ...quiz, status: 'published' })
      setStatusMessage(
        t('quizBuilder.published', {}, { defaultValue: 'Published — visible in Discover.' }),
      )
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className={cm.cn(cm.stack(6), cm.sp('py', 8))} data-testid="quiz-builder">
      <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'flex-wrap gap-4')}>
        <div>
          <span className={cm.cn('text-[10px] uppercase tracking-widest font-black text-primary')}>
            {t('nav.editor', {}, { defaultValue: 'Editor' })}
          </span>
          <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mt-1')}>
            {t('quizBuilder.title', {}, { defaultValue: 'Build your quiz' })}
          </h1>
          <p className={cm.cn('text-sm text-on-surface-variant mt-2 max-w-md')}>
            {t(
              'quizBuilder.subhead',
              {},
              {
                defaultValue:
                  'Edit the title, add questions, set choices and the correct answer. Changes save automatically.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
              quiz.status === 'published'
                ? 'bg-success-light text-success'
                : 'bg-warning-light text-warning',
            )}
            data-testid="quiz-status"
          >
            {quiz.status === 'published'
              ? t('status.published', {}, { defaultValue: 'Published' })
              : t('quizBuilder.statusDraft', {}, { defaultValue: 'Draft' })}
          </span>
          {quiz.status === 'published' ? (
            <button
              type="button"
              onClick={() => navigate(`/quiz/${quiz.id}`)}
              className={cm.cn(
                'px-4 py-2 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-extrabold uppercase tracking-widest hover:bg-surface-container transition-colors',
              )}
            >
              {t('quizBuilder.preview', {}, { defaultValue: 'View' })}
            </button>
          ) : (
            <button
              type="button"
              onClick={publish}
              disabled={publishing}
              data-testid="publish-quiz"
              className={cm.cn(
                'px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-extrabold uppercase tracking-widest shadow-md shadow-primary/20 disabled:opacity-50',
              )}
            >
              {publishing
                ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                : t('quizBuilder.publish', {}, { defaultValue: 'Publish quiz' })}
            </button>
          )}
        </div>
      </header>

      {statusMessage ? (
        <p
          className={cm.cn('text-sm font-bold rounded-xl bg-warning-light text-warning px-4 py-2')}
          data-testid="builder-status"
        >
          {statusMessage}
        </p>
      ) : null}

      <section
        className={cm.cn(
          'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          cm.sp('p', 6),
        )}
      >
        <label
          className={cm.cn(
            'text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-2 block',
          )}
        >
          {t('quizBuilder.titleLabel', {}, { defaultValue: 'Quiz title' })}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void saveTitle()}
          data-testid="quiz-title-input"
          className={cm.cn(
            'w-full text-2xl md:text-3xl font-extrabold tracking-tight bg-transparent border-b-2 border-outline-variant/40 focus:border-primary focus:outline-none pb-2 transition-colors',
          )}
        />
        <p className={cm.cn('text-xs text-on-surface-variant mt-3')}>
          {savingTitle
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t(
                'quizBuilder.idLabel',
                { id: quizId ?? 'new' },
                { defaultValue: 'Quiz id: {{id}}' },
              )}
        </p>
      </section>

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-[280px_1fr]')}>
        <aside
          className={cm.cn(
            'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            cm.sp('p', 4),
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
            <h2
              className={cm.cn(
                'text-sm font-extrabold tracking-tight uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('quizBuilder.questionsTitle', {}, { defaultValue: 'Questions' })}
            </h2>
            <button
              type="button"
              onClick={addQuestion}
              data-testid="add-question"
              className={cm.cn(
                'w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center',
              )}
              aria-label={t('quizBuilder.addQuestion', {}, { defaultValue: 'Add question' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                add
              </span>
            </button>
          </div>
          {questions.length === 0 ? (
            <p className={cm.cn('text-xs text-on-surface-variant')}>
              {t(
                'quizBuilder.noQuestions',
                {},
                { defaultValue: 'No questions yet — add one to begin.' },
              )}
            </p>
          ) : (
            <ol className={cm.cn('space-y-2')}>
              {questions.map((q, i) => {
                const isActive = q.id === active?.id
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(q.id)}
                      data-testid={`question-tab-${i}`}
                      className={cm.cn(
                        cm.w('full'),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'rounded-xl text-left text-xs font-bold transition-colors flex items-center gap-2',
                        isActive
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
                      )}
                    >
                      <span
                        className={cm.cn(
                          'w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-black',
                          isActive ? 'bg-amber-400 text-amber-950' : 'bg-primary/20 text-primary',
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className={cm.cn('truncate flex-1')}>
                        {q.prompt ||
                          t('quizBuilder.untitled', {}, { defaultValue: 'Untitled question' })}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </aside>

        {active ? (
          <div
            className={cm.cn(
              'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
              cm.sp('p', 6),
            )}
            data-testid="question-editor"
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <label
                className={cm.cn(
                  'text-[10px] uppercase tracking-widest font-black text-on-surface-variant',
                )}
              >
                {t('quizBuilder.promptLabel', {}, { defaultValue: 'Prompt' })}
              </label>
              <button
                type="button"
                onClick={() => void deleteQuestion(active.id)}
                data-testid="delete-question"
                className={cm.cn('text-xs font-bold text-error hover:text-error')}
              >
                {t('quizBuilder.delete', {}, { defaultValue: 'Delete question' })}
              </button>
            </div>
            <textarea
              value={active.prompt}
              onChange={(e) => setPrompt(active.id, e.target.value)}
              onBlur={() => commitPrompt(active.id)}
              rows={3}
              data-testid="question-prompt"
              className={cm.cn(
                'w-full bg-surface-container-low rounded-2xl p-4 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary/40',
              )}
            />

            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('mt', 5),
                cm.sp('mb', 3),
              )}
            >
              <p
                className={cm.cn(
                  'text-[10px] uppercase tracking-widest font-black text-on-surface-variant',
                )}
              >
                {t('quizBuilder.answersLabel', {}, { defaultValue: 'Answer choices' })}
              </p>
              <p
                className={cm.cn(
                  'text-[10px] uppercase tracking-widest font-black text-on-surface-variant',
                )}
              >
                {savingQuestion === active.id
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t(
                      'quizBuilder.timer',
                      { seconds: active.time_limit_s },
                      { defaultValue: '{{seconds}}s timer' },
                    )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ cols: 1, gap: 'sm' }), 'sm:grid-cols-2')}>
              {KEYS.map((key, idx) => {
                const choices = parseChoices(active.choices)
                const value = choices[idx] ?? ''
                const isCorrect = value !== '' && value === active.correct_answer
                return (
                  <label
                    key={key}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 3 }),
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'rounded-2xl border-2 cursor-pointer transition-all',
                      ANSWER_PALETTE[key],
                      isCorrect ? 'ring-4 ring-emerald-400/40' : '',
                    )}
                    data-testid={`choice-${key}`}
                  >
                    <span
                      className={cm.cn(
                        'w-9 h-9 rounded-xl bg-surface text-on-surface flex items-center justify-center font-black shadow-sm flex-shrink-0',
                      )}
                    >
                      {key}
                    </span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateChoice(active.id, idx, e.target.value)}
                      onBlur={() => commitChoices(active.id)}
                      data-testid={`choice-input-${key}`}
                      placeholder={t(
                        'quizBuilder.answerPlaceholder',
                        {},
                        { defaultValue: 'Type an option…' },
                      )}
                      className={cm.cn(
                        'flex-1 bg-transparent placeholder-on-surface-variant focus:outline-none text-sm font-bold',
                      )}
                    />
                    <input
                      type="radio"
                      name={`correct-${active.id}`}
                      checked={isCorrect}
                      onChange={() => value && setCorrect(active.id, value)}
                      disabled={!value}
                      data-testid={`mark-correct-${key}`}
                      className={cm.cn('w-5 h-5 accent-emerald-500')}
                      aria-label={t(
                        'quizBuilder.markCorrect',
                        { letter: key },
                        { defaultValue: 'Mark {{letter}} as correct' },
                      )}
                    />
                  </label>
                )
              })}
            </div>
          </div>
        ) : (
          <div
            className={cm.cn(
              'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
              cm.sp('p', 12),
              cm.textCenter,
            )}
          >
            <p className={cm.cn('text-sm font-bold mb-3')}>
              {t(
                'quizBuilder.firstQuestion',
                {},
                { defaultValue: 'Add your first question to start.' },
              )}
            </p>
            <button
              type="button"
              onClick={addQuestion}
              data-testid="add-first-question"
              className={cm.cn(
                'px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-extrabold uppercase tracking-widest',
              )}
            >
              {t('quizBuilder.addQuestion', {}, { defaultValue: 'Add question' })}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default QuizBuilder
