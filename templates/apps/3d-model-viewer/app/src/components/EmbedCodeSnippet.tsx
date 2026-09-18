import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface EmbedCodeSnippetProps {
  modelId: string
  embedId: string | null
  width: number
  height: number
}

function EmbedCodeSnippet({ modelId, embedId, width, height }: EmbedCodeSnippetProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  // Use the saved embed token (id) when available; otherwise fall back to the
  // model id with an inline note that the user must save first to get a real
  // shareable URL.
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://example.com'
  const tokenPath = embedId ? `embed/${embedId}` : `embed/preview/${modelId}`
  const embedCode = `<iframe src="${origin}/${tokenPath}" width="${width}" height="${height}" frameborder="0" allow="autoplay; fullscreen; xr-spatial-tracking" web-share></iframe>`
  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mt-auto">
      <div
        className={cm.cn(
          'bg-surface-container-low rounded-xl border border-outline-variant/15 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.2)]',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            'border-b border-outline-variant/10 bg-surface-container-highest/50',
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-mono text-on-surface-variant uppercase tracking-wider',
            )}
          >
            {embedId
              ? t('embedCodeSnippet.title', {}, { defaultValue: 'Embed Code' })
              : t(
                  'embedCodeSnippet.previewTitle',
                  {},
                  { defaultValue: 'Preview snippet (publish to lock the URL)' },
                )}
          </span>
          <button
            data-mol-id="embed-copy"
            onClick={handleCopy}
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 3),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'gap-1.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 hover:border-primary/40 hover:text-primary transition-colors text-on-surface-variant',
            )}
          >
            <span
              className="material-symbols-outlined text-[14px]"
              data-icon={copied ? 'check' : 'content_copy'}
            >
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied
              ? t('common.copiedBang', {}, { defaultValue: 'Copied!' })
              : t('common.copy', {}, { defaultValue: 'Copy' })}
          </button>
        </div>
        <div className={cm.cn(cm.sp('p', 4), 'overflow-x-auto')}>
          <pre
            data-mol-id="embed-snippet"
            className={cm.cn(cm.textSize('sm'), 'font-mono leading-relaxed')}
          >
            <code className="text-foreground-tertiary">{embedCode}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

export default EmbedCodeSnippet
export { EmbedCodeSnippet }
