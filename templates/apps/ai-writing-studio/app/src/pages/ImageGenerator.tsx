import { useState } from 'react'

import { getClient as getHttpClient } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface GeneratedImage {
  url: string
  revisedPrompt: string
}

interface GenerateResponse {
  url: string
  revisedPrompt: string
}

interface ImageGeneratorPageProps {
  documentId?: string
}

interface AxiosLikeError {
  response?: { data?: { error?: string } }
  message?: string
}

export function ImageGeneratorPage({ documentId }: ImageGeneratorPageProps) {
  const { t } = useTranslation()
  const http = getHttpClient()
  const cm = getClassMap()
  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(): Promise<void> {
    if (!prompt.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const endpoint = documentId ? '/images/generate-and-save' : '/images/generate'
      const response = await http.post(endpoint, {
        prompt: prompt.trim(),
        size: '1024x1024',
        document_id: documentId,
      })
      const data = response.data as GenerateResponse
      setImages((prev) => [{ url: data.url, revisedPrompt: data.revisedPrompt }, ...prev])
      setPrompt('')
    } catch (err) {
      const e = err as AxiosLikeError
      const remote = e?.response?.data?.error
      setError(
        remote ||
          e?.message ||
          t('imageGenerator.failed', {}, { defaultValue: 'Image generation failed.' }),
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      data-mol-id="page-image-generator"
      className={cm.cn(cm.sp('p', 8), 'bg-background min-h-screen')}
    >
      <div className={cm.cn('max-w-5xl', cm.mxAuto, cm.stack(8))}>
        <div>
          <h1
            className={cm.cn(
              'text-3xl font-extrabold tracking-tight font-serif text-on-background',
            )}
          >
            {t('imageGenerator.title', {}, { defaultValue: 'AI Image Generator' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textMuted)}>
            {t(
              'imageGenerator.subtitle',
              {},
              { defaultValue: 'Describe a cover image and let AI illustrate it.' },
            )}
          </p>
        </div>

        <div className={cm.cn(cm.stack(3))}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t(
              'imageGenerator.placeholder',
              {},
              { defaultValue: 'Describe the image you want to generate...' },
            )}
            aria-label={t('imageGenerator.promptAriaLabel', {}, { defaultValue: 'Image prompt' })}
            rows={3}
            className={cm.cn(
              cm.w('full'),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-lg bg-surface border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors',
            )}
          />
          <div>
            <button
              data-mol-id="button-generating"
              type="button"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-60',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                auto_awesome
              </span>
              {generating
                ? t('imageGenerator.generating', {}, { defaultValue: 'Generating...' })
                : t('imageGenerator.generate', {}, { defaultValue: 'Generate Image' })}
            </button>
          </div>
          {error ? (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('p', 4),
                cm.textSize('sm'),
                'rounded-lg bg-error-container text-on-error-container',
              )}
            >
              {error}
            </div>
          ) : null}
        </div>

        {images.length > 0 && (
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2')}>
            {images.map((img, index) => (
              <figure
                key={index}
                className={cm.cn(
                  'rounded-xl bg-surface border border-outline-variant overflow-hidden shadow-sm',
                )}
              >
                {img.url ? (
                  <img src={img.url} alt={img.revisedPrompt} className={cm.cn('w-full h-auto')} />
                ) : null}
                <figcaption
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.textSize('sm'),
                    cm.textMuted,
                    'font-serif italic leading-relaxed',
                  )}
                >
                  {img.revisedPrompt}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageGeneratorPage
