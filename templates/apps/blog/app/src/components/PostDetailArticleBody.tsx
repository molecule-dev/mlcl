import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { usePost } from './PostContext.js'
import PostDetailSocialShare from './PostDetailSocialShare.js'
import PostDetailTagsSection from './PostDetailTagsSection.js'

function paragraphs(content: string): string[] {
  return content
    .split(/\n\n+/g)
    .map((p) => p.trim())
    .filter(Boolean)
}

function PostDetailArticleBody() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { post } = usePost()
  const content = String(post?.content ?? '').trim()
  const paras = paragraphs(content)
  return (
    <article
      className={cm.cn('max-w-[680px]', cm.mxAuto, 'prose-editorial')}
      data-mol-id="post-article-body"
    >
      {paras.length > 0 ? (
        paras.map((p, i) => <p key={i}>{p}</p>)
      ) : (
        <p className={cm.cn('text-on-surface-variant italic')}>
          {t(
            'postDetailArticleBody.empty',
            {},
            { defaultValue: 'This post does not have any content yet.' },
          )}
        </p>
      )}
      <PostDetailTagsSection />
      <PostDetailSocialShare />
    </article>
  )
}

export default PostDetailArticleBody
export { PostDetailArticleBody }
