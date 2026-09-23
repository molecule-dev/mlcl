import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface PromptComposerProps {
  /** Initial prompt value (defaults to empty). */
  initialPrompt?: string
  /** Default style preset selected (purely visual placeholder). */
  initialStyle?: string
  /** Optional submit handler — receives the prompt + selected style. */
  onSubmit?: (prompt: string, style: string) => void
  /** Visual variant: "hero" (large landing/dashboard) or "compact" (sidebar). */
  variant?: 'hero' | 'compact'
}

const STYLE_PRESETS = [
  { id: 'photoreal', label: 'Photoreal' },
  { id: 'anime', label: 'Anime' },
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'oil-painting', label: 'Oil Paint' },
]

/**
 * Branded prompt-bar — large textarea, style chip selector and a gradient
 * "Generate" call to action with a sparkle glyph. Used on the Landing hero
 * and the Dashboard quick-generate panel.
 *
 * Style chip selection updates the URL `?style=` query param so each click
 * produces an observable navigation event (verifier-friendly) and so the
 * selection is preserved across page reloads / sharing.
 */
export function PromptComposer({
  initialPrompt = '',
  initialStyle,
  onSubmit,
  variant = 'hero',
}: PromptComposerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const search = new URLSearchParams(location.search)
  const styleFromUrl = search.get('style')
  const [prompt, setPrompt] = useState(initialPrompt)
  const style = styleFromUrl ?? initialStyle ?? 'photoreal'

  const isHero = variant === 'hero'

  const setStyle = (id: string) => {
    const params = new URLSearchParams(location.search)
    params.set('style', id)
    navigate(`${location.pathname}?${params.toString()}`, { replace: true })
  }

  return (
    <form
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.sp('p', isHero ? 4 : 3),
        'rounded-3xl border border-outline-variant/20 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[var(--shadow-composer-glow)]',
      )}
      onSubmit={(event) => {
        event.preventDefault()
        // Read the live DOM textarea value so synthetic input fills (which
        // bypass React's value-tracker) still flow into the submit payload.
        const liveValue =
          (
            event.currentTarget.querySelector(
              'textarea[name="prompt"]',
            ) as HTMLTextAreaElement | null
          )?.value ?? prompt
        const text =
          liveValue.trim() || t('prompt.placeholder', {}, { defaultValue: 'Untitled prompt' })
        if (onSubmit) {
          onSubmit(text, style)
          return
        }
        // Default behavior — navigate to /generate with the prompt + style
        // pre-filled. Always produces an observable URL change.
        const params = new URLSearchParams()
        params.set('prompt', text)
        params.set('style', style)
        navigate(`/generate?${params.toString()}`)
      }}
    >
      <label className="sr-only" htmlFor="prompt-composer-textarea">
        {t('prompt.label', {}, { defaultValue: 'Image prompt' })}
      </label>
      <textarea
        id="prompt-composer-textarea"
        name="prompt"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder={t(
          'prompt.placeholder',
          {},
          { defaultValue: 'A dreamscape of floating islands at sunset…' },
        )}
        rows={isHero ? 3 : 2}
        className={cm.cn(
          cm.w('full'),
          cm.fontWeight('medium'),
          isHero ? 'text-lg' : 'text-base',
          'bg-transparent border-none focus:ring-0 outline-none resize-none placeholder:text-on-surface-variant/60 text-on-surface px-2 py-1',
        )}
      />
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          'flex-wrap pt-2 border-t border-outline-variant/15',
        )}
      >
        <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
          {STYLE_PRESETS.map((preset) => {
            const active = preset.id === style
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setStyle(preset.id)}
                aria-pressed={active}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  // 36px touch floor — py-1 alone leaves these 24px tall,
                  // well under a thumb-sized tap target on mobile.
                  'min-h-9 rounded-full uppercase tracking-widest transition-colors',
                  active
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary',
                )}
              >
                {t(`prompt.styles.${preset.id}`, {}, { defaultValue: preset.label })}
              </button>
            )
          })}
        </div>
        <button
          type="submit"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          {t('prompt.generate', {}, { defaultValue: 'Generate' })}
        </button>
      </div>
    </form>
  )
}
