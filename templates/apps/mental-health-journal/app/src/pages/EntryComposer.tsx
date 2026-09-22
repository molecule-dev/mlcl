import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { MoodLevel } from '../components/MoodHeroCard.js'

const MOOD_OPTIONS: { key: MoodLevel; icon: string; label: string; color: string }[] = [
  { key: 'radiant', icon: 'mood', label: 'Radiant', color: 'var(--color-mood-radiant-dot)' },
  { key: 'good', icon: 'sentiment_satisfied', label: 'Good', color: 'var(--color-mood-good-dot)' },
  {
    key: 'neutral',
    icon: 'sentiment_neutral',
    label: 'Neutral',
    color: 'var(--color-mood-neutral-dot)',
  },
  { key: 'low', icon: 'sentiment_dissatisfied', label: 'Low', color: 'var(--color-mood-low-dot)' },
  {
    key: 'struggling',
    icon: 'sentiment_very_dissatisfied',
    label: 'Struggling',
    color: 'var(--color-mood-struggling-dot)',
  },
]

// `slug` matches the seeded prompt library (api/migrations/0011_seed_prompts.sql)
// so saved entries link to their prompt row via the API's slug → id lookup.
const DEFAULT_PROMPTS = [
  {
    key: 'gratitude',
    slug: 'gratitude-small-thing',
    defaultText: 'What is one small thing you are grateful for today?',
  },
  { key: 'feeling', slug: 'feeling-honest', defaultText: 'How are you feeling — really?' },
  {
    key: 'kindness',
    slug: 'kindness-witness',
    defaultText: 'Where did you witness kindness today (yours or someone else’s)?',
  },
  {
    key: 'learn',
    slug: 'learn-self',
    defaultText: 'What is something you learned about yourself recently?',
  },
  {
    key: 'release',
    slug: 'release-sleep',
    defaultText: 'What can you let go of, gently, before sleep?',
  },
] as const

export function EntryComposer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  // Arriving from the prompt library ("Write about this") carries the chosen
  // prompt along: ?prompt=<slug>&text=<prompt text>.
  const [searchParams] = useSearchParams()
  const queryPromptSlug = searchParams.get('prompt')
  const queryPromptText = searchParams.get('text')

  const [mood, setMood] = useState<MoodLevel>('good')
  const [activePrompt, setActivePrompt] = useState<string>(
    queryPromptSlug ?? DEFAULT_PROMPTS[0].slug,
  )
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wordCount = body.trim().length === 0 ? 0 : body.trim().split(/\s+/).length

  const addTag = () => {
    const v = tagDraft.trim().toLowerCase()
    if (!v || tags.includes(v)) {
      setTagDraft('')
      return
    }
    setTags([...tags, v])
    setTagDraft('')
  }
  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await http.post('/api/journal/entries', {
        mood,
        title,
        body,
        tags,
        prompt: activePrompt,
      })
      // Domain event at the commit point — fire-and-forget (no-op without a
      // provider bonded; never blocks navigation on tracking).
      const created = unwrapSingle<{ id?: string }>(res)
      void track({
        name: 'entry.created',
        properties: { entry_id: created?.id, mood, word_count: wordCount, prompt: activePrompt },
      })
      navigate('/journal', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('entryComposer.saveError', {}, { defaultValue: 'Could not save your entry.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const promptText =
    activePrompt === queryPromptSlug && queryPromptText
      ? queryPromptText
      : (DEFAULT_PROMPTS.find((p) => p.slug === activePrompt)?.defaultText ??
        DEFAULT_PROMPTS[0].defaultText)

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h1
            className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}
          >
            {t('entryComposer.heading', {}, { defaultValue: 'Today’s reflection' })}
          </h1>
        </div>
        <Link
          to="/journal"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('entryComposer.cancel', {}, { defaultValue: 'Back to journal' })}
        </Link>
      </header>

      <form onSubmit={handleSave} className={cm.cn('space-y-6')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
          )}
        >
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('entryComposer.moodLabel', {}, { defaultValue: 'How are you feeling?' })}
          </h3>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'flex-wrap justify-start gap-2')}>
            {MOOD_OPTIONS.map((opt) => {
              const selected = mood === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setMood(opt.key)}
                  aria-pressed={selected}
                  className={cm.cn(
                    cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                    cm.sp('py', 3),
                    cm.sp('px', 4),
                    'rounded-2xl transition-all',
                    selected
                      ? 'shadow-md scale-105 text-white'
                      : 'bg-surface-container hover:bg-surface-container-high',
                  )}
                  style={selected ? { backgroundColor: opt.color } : undefined}
                >
                  <span
                    className="material-symbols-outlined text-3xl"
                    aria-hidden="true"
                    style={selected ? { color: 'white' } : { color: opt.color }}
                  >
                    {opt.icon}
                  </span>
                  <span
                    className={cm.cn(
                      'text-[10px] font-bold uppercase tracking-widest',
                      selected ? 'text-white' : 'text-on-surface-variant',
                    )}
                  >
                    {t(`entryComposer.mood.${opt.key}`, {}, { defaultValue: opt.label })}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('entryComposer.promptLabel', {}, { defaultValue: 'A gentle prompt' })}
            </h3>
            <Link
              to="/prompts"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.textPrimary)}
            >
              {t('entryComposer.promptsLibrary', {}, { defaultValue: 'See all prompts →' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
            {DEFAULT_PROMPTS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setActivePrompt(p.slug)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('bold'),
                  'rounded-full text-[11px] uppercase tracking-widest transition-colors',
                  activePrompt === p.slug
                    ? 'text-white shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                )}
                style={
                  activePrompt === p.slug
                    ? {
                        background:
                          'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
                      }
                    : undefined
                }
              >
                {t(`entryComposer.prompt.${p.key}.label`, {}, { defaultValue: p.key })}
              </button>
            ))}
          </div>
          <div
            className={cm.cn(cm.sp('p', 5), 'rounded-2xl border-l-4 border-primary')}
            style={{
              background:
                'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(167, 139, 250, 0.05))',
            }}
          >
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'italic text-on-surface',
              )}
            >
              “{t(`entryComposer.prompt.${activePrompt}.text`, {}, { defaultValue: promptText })}”
            </p>
          </div>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
          )}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t(
              'entryComposer.titlePlaceholder',
              {},
              { defaultValue: 'Give this reflection a name…' },
            )}
            className={cm.cn(
              cm.fontWeight('extrabold'),
              'w-full text-2xl bg-transparent text-on-surface placeholder:text-on-surface-variant border-0 focus:outline-none',
            )}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t(
              'entryComposer.bodyPlaceholder',
              {},
              { defaultValue: 'Write whatever feels honest. No one else will read this.' },
            )}
            rows={12}
            className={cm.cn(
              cm.sp('p', 4),
              'w-full text-base bg-surface-container rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors leading-relaxed',
            )}
            style={{ fontFamily: '"Lora", Georgia, serif' }}
          />
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.textSize('xs'),
              'text-on-surface-variant',
            )}
          >
            <span className={cm.cn(cm.fontWeight('bold'), 'uppercase tracking-widest')}>
              {t('common.countWords', { count: wordCount }, { defaultValue: '{{count}} words' })}
            </span>
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                lock
              </span>
              {t('common.endToEndEncrypted', {}, { defaultValue: 'End-to-end encrypted' })}
            </span>
          </div>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface-container-lowest rounded-2xl shadow-sm space-y-3',
          )}
        >
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.tags', {}, { defaultValue: 'Tags' })}
          </h3>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
            {tags.map((tag) => (
              <span
                key={tag}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.fontWeight('medium'),
                  'rounded-full text-[11px] py-0.5',
                )}
                style={{
                  backgroundColor: 'rgba(167, 139, 250, 0.18)',
                  color: 'var(--mol-color-primary)',
                }}
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={t(
                    'entryComposer.removeTag',
                    { tag },
                    { defaultValue: 'Remove {{tag}}' },
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>close</span>
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder={t(
                'entryComposer.tagPlaceholder',
                {},
                { defaultValue: 'Add a tag and press enter' },
              )}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                'flex-1 min-w-[180px] bg-surface-container rounded-full text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary',
              )}
            />
          </div>
        </section>

        {error ? (
          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : null}

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            'flex-wrap',
          )}
        >
          <Link
            to="/journal"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full border-2 border-outline-variant hover:border-primary text-on-surface-variant transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={saving || body.trim().length === 0}
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('base'),
              'inline-flex items-center gap-2 rounded-full text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed',
            )}
            style={{
              background:
                'linear-gradient(90deg, var(--mol-color-primary), var(--mol-color-secondary))',
            }}
          >
            <span className="material-symbols-outlined">check_circle</span>
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('entryComposer.save', {}, { defaultValue: 'Save reflection' })}
          </button>
        </div>
      </form>
    </div>
  )
}
