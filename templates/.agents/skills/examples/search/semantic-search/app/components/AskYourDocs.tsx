import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Source = { text: string; score: number; title: string }

/**
 * "Ask your documents" panel: the user types a question, and the server runs a
 * grounded RAG answer over ONLY that user's indexed documents (`POST /api/kb/ask`)
 * and renders the answer plus the source excerpts it was grounded in.
 *
 * The model + vector store are never touched from the browser — retrieval and
 * generation happen server-side, scoped to the caller's own documents, and the
 * endpoint is rate-limited. Index documents first via `POST /api/kb/documents`.
 */
export function AskYourDocs() {
  const { t } = useTranslation()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function ask(): Promise<void> {
    if (!question.trim()) return
    setStatus('loading')
    setAnswer('')
    setSources([])
    try {
      const res = await fetch('/api/kb/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      if (!res.ok) {
        setStatus('error')
        return
      }
      const data = (await res.json()) as { answer: string; sources: Source[] }
      setAnswer(data.answer)
      setSources(data.sources ?? [])
      setStatus('idle')
    } catch (_error) {
      // Network failure — show the generic error state; the server logs specifics.
      setStatus('error')
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))} style={{ maxWidth: '44rem' }}>
      <textarea
        data-mol-id="kb-question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={t('kb.questionPlaceholder', undefined, {
          defaultValue: 'Ask a question about your documents…',
        })}
        aria-label={t('kb.questionLabel', undefined, { defaultValue: 'Question' })}
        rows={3}
        className={cm.input({})}
      />
      <button
        type="button"
        data-mol-id="kb-ask"
        onClick={ask}
        disabled={status === 'loading' || !question.trim()}
        className={cm.button({ variant: 'solid' })}
      >
        {status === 'loading'
          ? t('kb.asking', undefined, { defaultValue: 'Searching your docs…' })
          : t('kb.ask', undefined, { defaultValue: 'Ask' })}
      </button>
      {status === 'error' ? (
        <p className={cm.textError}>
          {t('kb.error', undefined, { defaultValue: 'Something went wrong. Try again.' })}
        </p>
      ) : null}
      {answer ? (
        <div data-mol-id="kb-answer" className={cm.cn(cm.card({}), cm.sp('p', 3))}>
          {answer}
        </div>
      ) : null}
      {sources.length > 0 ? (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          {sources.map((s, i) => (
            <div key={i} data-mol-id="kb-source" className={cm.cn(cm.card({}), cm.sp('p', 3))}>
              <span className={cm.textMuted}>
                {t(
                  'kb.source',
                  { title: s.title || t('kb.untitled', undefined, { defaultValue: 'Untitled' }) },
                  { defaultValue: 'Source: {{title}}' },
                )}
              </span>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default AskYourDocs
