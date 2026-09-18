import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { usePost } from './PostContext.js'

interface AuthorInfo {
  id: string
  name?: string | null
  email?: string | null
  bio?: string | null
  oauthData?: { bio?: string; profileVisible?: boolean; showEmail?: boolean } | null
}

function AuthorBioCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { post } = usePost()
  const http = useHttpClient()
  const [author, setAuthor] = useState<AuthorInfo | null>(null)

  useEffect(() => {
    if (!post?.author_id) return
    let cancelled = false
    http
      .get<AuthorInfo>(`/api/users/public/${post.author_id}`)
      .then((res) => {
        if (cancelled) return
        const payload = res.data
        if (payload && (payload as AuthorInfo).id) {
          setAuthor(payload as AuthorInfo)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, post?.author_id])

  const fallbackName = post?.author_name || author?.name || null
  if (!fallbackName && !author?.email) return null
  const displayName = fallbackName ?? (author?.email ? author.email.split('@')[0] : 'Author')
  const bioFromOauth = author?.oauthData?.bio ?? null
  const bio = post?.author_bio || bioFromOauth || null

  return (
    <section className={cm.cn(cm.mxAuto, 'max-w-[680px]', 'mb-20')} data-mol-id="post-author-card">
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'xl' }),
          cm.sp('p', 8),
          'bg-surface-container-low rounded-xl md:flex-row md:items-start',
        )}
      >
        <div
          aria-hidden="true"
          className={cm.cn(cm.w(24), cm.h(24), cm.roundedFull, 'bg-surface-container-high')}
        />
        <div className={cm.cn(cm.flex1, cm.textCenter, 'md:text-left')}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', justify: 'between', gap: 'md' }),
              cm.sp('mb', 3),
              'md:flex-row md:items-center',
            )}
          >
            <h3 className={cm.cn(cm.textSize('2xl'), 'font-headline font-extrabold')}>
              {t(
                'authorBioCard.byline',
                { name: displayName },
                { defaultValue: 'Written by {{name}}' },
              )}
            </h3>
          </div>
          {bio ? (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mb', 4),
                'font-body text-on-surface-variant leading-relaxed',
              )}
              data-mol-id="post-author-bio"
            >
              {bio}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default AuthorBioCard
export { AuthorBioCard }
