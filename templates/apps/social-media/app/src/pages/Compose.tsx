import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const VISIBILITIES = ['public', 'followers', 'private'] as const
type Visibility = (typeof VISIBILITIES)[number]

export function Compose() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [caption, setCaption] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [location, setLocation] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (posting) return
    setPosting(true)
    setError(null)
    try {
      const hashtags = tagsInput
        .split(/[,\s]+/)
        .map((t) => t.replace(/^#/, '').trim().toLowerCase())
        .filter(Boolean)
      const body = {
        caption: caption.trim(),
        hashtags,
        location: location.trim() || null,
        visibility,
        media_urls: [],
      }
      const res = await http.post<{ id: string }>('/posts', body)
      const id = res.data?.id
      if (id) {
        navigate(`/posts/${id}`)
      } else {
        navigate('/feed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish post')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-2xl')}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('common.create', {}, { defaultValue: 'Create' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight md:text-4xl mt-1')}>
          {t('compose.heading', {}, { defaultValue: 'Share a moment' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
          {t(
            'compose.subheading',
            {},
            { defaultValue: "Caption first; we'll wire image uploads next." },
          )}
        </p>
      </header>

      <form
        onSubmit={submit}
        data-testid="compose-form"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm space-y-5',
        )}
      >
        <div>
          <label
            htmlFor="compose-caption"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('compose.caption', {}, { defaultValue: 'Caption' })}
          </label>
          <textarea
            id="compose-caption"
            data-testid="compose-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            required
            rows={5}
            maxLength={2200}
            placeholder={t(
              'compose.captionPlaceholder',
              {},
              { defaultValue: "What's on your mind?" },
            )}
            className={cm.cn(
              cm.sp('p', 3),
              'mt-2 w-full rounded-xl bg-surface-container border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary text-sm',
            )}
          />
        </div>

        <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
          <div>
            <label
              htmlFor="compose-tags"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('compose.hashtags', {}, { defaultValue: 'Hashtags' })}
            </label>
            <input
              id="compose-tags"
              data-testid="compose-hashtags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="goldenhour studio"
              className={cm.cn(
                cm.sp('p', 3),
                'mt-2 w-full rounded-xl bg-surface-container border border-outline-variant text-sm',
              )}
            />
          </div>
          <div>
            <label
              htmlFor="compose-location"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.location', {}, { defaultValue: 'Location' })}
            </label>
            <input
              id="compose-location"
              data-testid="compose-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Tokyo"
              className={cm.cn(
                cm.sp('p', 3),
                'mt-2 w-full rounded-xl bg-surface-container border border-outline-variant text-sm',
              )}
            />
          </div>
        </div>

        <div>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('compose.visibility', {}, { defaultValue: 'Audience' })}
          </span>
          <div className={cm.cn('mt-2 flex flex-wrap gap-2')}>
            {VISIBILITIES.map((v) => (
              <label
                key={v}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer border',
                  visibility === v
                    ? 'bg-primary text-on-primary border-primary'
                    : 'border-outline-variant text-on-surface hover:bg-surface-container-low',
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={v}
                  data-testid={`compose-visibility-${v}`}
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                  className={cm.cn('sr-only')}
                />
                {t(`compose.audience.${v}`, {}, { defaultValue: v })}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div
            className={cm.cn(
              'rounded-xl border border-red-300 bg-error-light text-error px-4 py-3 text-sm',
            )}
            role="alert"
          >
            {error}
          </div>
        )}

        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'pt-2')}>
          <Link
            to="/feed"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full text-sm font-bold border border-outline-variant',
            )}
          >
            {t('compose.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            data-testid="compose-submit"
            disabled={posting || !caption.trim()}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              'rounded-full text-sm font-bold bg-primary text-on-primary disabled:bg-surface-container-high disabled:text-on-surface-variant',
            )}
          >
            {posting
              ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
              : t('common.publish', {}, { defaultValue: 'Publish' })}
          </button>
        </div>
      </form>
    </div>
  )
}
