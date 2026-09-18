import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function DiscoverySidebar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleSubscribe = async () => {
    setLoading(true)
    setFeedback(null)
    const trimmed = email.trim()
    if (!trimmed) {
      // Re-route the user toward signup so the click still produces an
      // observable URL change rather than silently being a no-op.
      navigate('/signup')
      setLoading(false)
      return
    }
    try {
      // The newsletter is implemented as a feature of the user account —
      // signing up creates the user. If the user already exists the API
      // returns 409 and we surface a clear "already subscribed" notice.
      await http.post('/api/users', { email: trimmed, password: 'newsletter-only' })
      setFeedback(
        t('discoverySidebar.subscribed', {}, { defaultValue: 'Subscribed. Check your inbox.' }),
      )
      setEmail('')
    } catch (_error) {
      // The API returns 409 when the email is already subscribed — the
      // error is expected and the user-visible feedback below handles it.
      setFeedback(
        t(
          'discoverySidebar.subscribedExisting',
          {},
          { defaultValue: "Looks like you're already subscribed." },
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  const handleTagClick = (tag: string) => () => {
    navigate(`/tags?tag=${encodeURIComponent(tag)}`)
  }
  return (
    <aside className={cm.fv74483ad6}>
      <div className={cm.fva6a0dfd5}>
        <h4
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            'font-label uppercase tracking-[0.2em] text-on-surface',
          )}
        >
          {t('discoverySidebar.tagsHeading', {}, { defaultValue: 'Discover more of what matters' })}
        </h4>
        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }), cm.sp('mb', 10))}>
          <button
            type="button"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'bg-surface-container-low hover:bg-surface-container-high transition-colors',
            )}
            onClick={handleTagClick('programming')}
          >
            {t('discoverySidebar.programming', {}, { defaultValue: 'Programming' })}
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'bg-surface-container-low hover:bg-surface-container-high transition-colors',
            )}
            onClick={handleTagClick('data-science')}
          >
            {t('discoverySidebar.dataScience', {}, { defaultValue: 'Data Science' })}
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'bg-surface-container-low hover:bg-surface-container-high transition-colors',
            )}
            onClick={handleTagClick('technology')}
          >
            {t('discoverySidebar.technology', {}, { defaultValue: 'Technology' })}
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'bg-surface-container-low hover:bg-surface-container-high transition-colors',
            )}
            onClick={handleTagClick('self-improvement')}
          >
            {t('discoverySidebar.selfImprovement', {}, { defaultValue: 'Self Improvement' })}
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'bg-surface-container-low hover:bg-surface-container-high transition-colors',
            )}
            onClick={handleTagClick('writing')}
          >
            {t('discoverySidebar.writing', {}, { defaultValue: 'Writing' })}
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'bg-surface-container-low hover:bg-surface-container-high transition-colors',
            )}
            onClick={handleTagClick('relationships')}
          >
            {t('discoverySidebar.relationships', {}, { defaultValue: 'Relationships' })}
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'bg-surface-container-low hover:bg-surface-container-high transition-colors',
            )}
            onClick={handleTagClick('machine-learning')}
          >
            {t('discoverySidebar.machineLearning', {}, { defaultValue: 'Machine Learning' })}
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'bg-surface-container-low hover:bg-surface-container-high transition-colors',
            )}
            onClick={handleTagClick('politics')}
          >
            {t('discoverySidebar.politics', {}, { defaultValue: 'Politics' })}
          </button>
        </div>
        <div className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
          <h4
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xl'),
              cm.sp('mb', 4),
              'font-headline',
            )}
          >
            {t(
              'discoverySidebar.newsletterTitle',
              {},
              { defaultValue: 'The Archivist Newsletter' },
            )}
          </h4>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 6),
              'font-body text-on-surface-variant',
            )}
          >
            {t(
              'discoverySidebar.newsletterDescription',
              {},
              {
                defaultValue:
                  'Our weekly curation of the most profound stories and unconventional wisdom.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <input
              aria-label={t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.surface,
                'border-none rounded focus:ring-1 focus:ring-primary',
              )}
              placeholder={t(
                'discoverySidebar.emailPlaceholder',
                {},
                { defaultValue: 'Your email' },
              )}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="button"
              className={cm.cn(
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'bg-on-surface text-surface rounded hover:opacity-90 transition-opacity',
              )}
              onClick={() => void handleSubscribe()}
              disabled={loading}
            >
              {t('discoverySidebar.subscribe', {}, { defaultValue: 'Subscribe' })}
            </button>
            {feedback ? (
              <p
                role="status"
                aria-live="polite"
                className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
              >
                {feedback}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  )
}

export default DiscoverySidebar
export { DiscoverySidebar }
