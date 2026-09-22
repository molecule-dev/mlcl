import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CairnHeroCard } from '../components/CairnHeroCard.js'

type PostKind = 'link' | 'text'

const FALLBACK_SUBS = ['general', 'design', 'databases', 'reading', 'webdev', 'meta']
const SUGGESTED_TAGS = ['longread', 'discussion', 'opinion', 'tooling', 'paper']

export function SubmitLink() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [availableSubs, setAvailableSubs] = useState<string[] | null>(null)

  useEffect(() => {
    let active = true
    http
      .get<{ data?: unknown }>('/api/subs?limit=24')
      .then((res) => {
        if (!active) return
        const list = (res as { data?: unknown }).data
        const rows = Array.isArray(list)
          ? list
          : Array.isArray((list as { data?: unknown[] })?.data)
            ? (list as { data: unknown[] }).data
            : []
        const slugs = rows
          .map((r) => {
            const rec = r as Record<string, unknown>
            return typeof rec.slug === 'string'
              ? rec.slug
              : typeof rec.name === 'string'
                ? rec.name
                : ''
          })
          .filter(Boolean)
        if (slugs.length) setAvailableSubs(slugs)
      })
      .catch(() => {
        if (active) setAvailableSubs(null)
      })
    return () => {
      active = false
    }
  }, [http])

  const subs = useMemo(
    () => (availableSubs && availableSubs.length > 0 ? availableSubs : FALLBACK_SUBS),
    [availableSubs],
  )

  const [kind, setKind] = useState<PostKind>('link')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [sub, setSub] = useState(FALLBACK_SUBS[0])

  useEffect(() => {
    if (availableSubs && availableSubs.length > 0 && !availableSubs.includes(sub)) {
      setSub(availableSubs[0])
    }
  }, [availableSubs, sub])
  const [tags, setTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError(t('submitLink.titleRequired', {}, { defaultValue: 'A title is required.' }))
      return
    }
    if (kind === 'link' && !url.trim()) {
      setError(
        t('submitLink.urlRequired', {}, { defaultValue: 'A URL is required for link posts.' }),
      )
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await http.post('/api/links', {
        title: title.trim(),
        url: kind === 'link' ? url.trim() : null,
        text: kind === 'text' ? text.trim() : null,
        sub_slug: sub,
        tags,
      })
      const inner = ((res as { data?: unknown }).data ?? res) as { id?: string }
      if (inner?.id) {
        track({
          name: 'link.created',
          properties: { link_id: inner.id, sub_slug: sub, kind },
        })
        navigate(`/links/${inner.id}`)
      } else {
        navigate('/feed')
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('submitLink.submitError', {}, { defaultValue: 'Failed to submit \u2014 try again.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <CairnHeroCard
        eyebrowKey="eyebrow"
        eyebrowDefault={t('common.submit', {}, { defaultValue: 'Submit' })}
        headlineKey="headline"
        headlineDefault={t(
          'submitLink.heroHeadline',
          {},
          { defaultValue: 'Stack a stone on the cairn.' },
        )}
        bodyKey="body"
        bodyDefault={t(
          'submitLink.heroBody',
          {},
          {
            defaultValue:
              'Share a link or write a short text post. Pick the sub that fits, add a tag or two, and the community decides if it climbs.',
          },
        )}
        pillKey="pill"
        pillIcon="add_link"
        pillDefault={t('submitLink.heroPill', {}, { defaultValue: 'New post' })}
      />

      <form
        onSubmit={handleSubmit}
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('p', 1),
            cm.roundedFull,
            'bg-surface-container-low w-fit',
          )}
        >
          {(['link', 'text'] as PostKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest transition-colors',
                kind === k
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-primary',
              )}
              aria-pressed={kind === k}
            >
              {t(`submitLink.kind.${k}`, {}, { defaultValue: k === 'link' ? 'Link' : 'Text' })}
            </button>
          ))}
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <label
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
            htmlFor="submit-title"
          >
            {t('submitLink.titleLabel', {}, { defaultValue: 'Title' })}
          </label>
          <input
            id="submit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('lg'),
              'rounded-xl border border-outline-variant/40 bg-surface focus:border-primary focus:outline-none text-on-surface',
            )}
            placeholder={t(
              'submitLink.titlePlaceholder',
              {},
              { defaultValue: 'A clear, specific title' },
            )}
          />
        </div>

        {kind === 'link' ? (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
              htmlFor="submit-url"
            >
              {t('submitLink.urlLabel', {}, { defaultValue: 'URL' })}
            </label>
            <input
              id="submit-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl border border-outline-variant/40 bg-surface focus:border-primary focus:outline-none text-on-surface font-mono text-sm',
              )}
              placeholder="https://"
            />
          </div>
        ) : (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
              htmlFor="submit-text"
            >
              {t('submitLink.textLabel', {}, { defaultValue: 'Text post' })}
            </label>
            <textarea
              id="submit-text"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('base'),
                'rounded-xl border border-outline-variant/40 bg-surface focus:border-primary focus:outline-none text-on-surface resize-y',
              )}
              placeholder={t(
                'submitLink.textPlaceholder',
                {},
                { defaultValue: 'What do you want to say?' },
              )}
            />
          </div>
        )}

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('submitLink.subLabel', {}, { defaultValue: 'Post to sub' })}
          </span>
          <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
            {subs.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSub(s)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest transition-colors',
                  sub === s
                    ? 'bg-primary text-on-primary'
                    : 'bg-primary/10 text-primary hover:bg-primary/20',
                )}
                aria-pressed={sub === s}
              >
                c/{s}
              </button>
            ))}
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.tags', {}, { defaultValue: 'Tags' })}
          </span>
          <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
            {SUGGESTED_TAGS.map((tag) => {
              const active = tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'transition-colors',
                    active
                      ? 'bg-secondary text-on-secondary'
                      : 'bg-secondary/10 text-secondary hover:bg-secondary/20',
                  )}
                  aria-pressed={active}
                >
                  #{tag}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), 'rounded-lg bg-error/10 text-error')}
          >
            {error}
          </p>
        )}

        <div className={cm.cn(cm.flex({ justify: 'end', align: 'center', gap: 'sm' }))}>
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60 transition-colors',
            )}
          >
            <span className={'material-symbols-outlined text-base'}>send</span>
            {submitting
              ? t('submitLink.submitting', {}, { defaultValue: 'Posting\u2026' })
              : t(
                  'submitLink.submit',
                  { appName: APP_NAME },
                  { defaultValue: 'Post to {{appName}}' },
                )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SubmitLink
