import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

type Mode = 'generate' | 'summarize' | 'rewrite'

/**
 * A prompt box + "Generate" button that calls the SERVER-SIDE AI endpoint
 * (`POST /api/generate`) and renders the returned text. The model is never
 * called from the browser — the API key stays on the server and the endpoint
 * is rate-limited. `mode` picks the server-side system prompt.
 *
 * For a full token-by-token streaming chat assistant, use the
 * `@molecule/app-ai-chat` feature package instead of hand-rolling one here.
 */
export function AiGenerateButton({ mode = 'generate' }: { mode?: Mode }) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function run(): Promise<void> {
    if (!prompt.trim()) return
    setStatus('loading')
    setResult('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode }),
      })
      if (!res.ok) {
        setStatus('error')
        return
      }
      const data = (await res.json()) as { text: string }
      setResult(data.text)
      setStatus('idle')
    } catch (_error) {
      // Network failure — show the generic error state. Nothing actionable to
      // log client-side; the server logs the provider/network specifics.
      setStatus('error')
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))} style={{ maxWidth: '40rem' }}>
      <textarea
        data-mol-id="ai-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t('ai.promptPlaceholder', undefined, {
          defaultValue: 'Describe what you want…',
        })}
        aria-label={t('ai.promptLabel', undefined, { defaultValue: 'AI prompt' })}
        rows={4}
        className={cm.input({})}
      />
      <button
        type="button"
        data-mol-id="ai-generate"
        onClick={run}
        disabled={status === 'loading' || !prompt.trim()}
        className={cm.button({ variant: 'solid' })}
      >
        {status === 'loading'
          ? t('ai.generating', undefined, { defaultValue: 'Generating…' })
          : t('ai.generate', undefined, { defaultValue: 'Generate' })}
      </button>
      {status === 'error' ? (
        <p className={cm.textError}>
          {t('ai.error', undefined, { defaultValue: 'Something went wrong. Try again.' })}
        </p>
      ) : null}
      {result ? (
        <div data-mol-id="ai-result" className={cm.cn(cm.card({}), cm.sp('p', 3))}>
          {result}
        </div>
      ) : null}
    </div>
  )
}

export default AiGenerateButton
