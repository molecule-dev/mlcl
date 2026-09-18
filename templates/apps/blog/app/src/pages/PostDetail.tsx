import { useEffect } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AuthorBioCard from '../components/AuthorBioCard.js'
import { PostProvider, usePost } from '../components/PostContext.js'
import PostDetailArticleBody from '../components/PostDetailArticleBody.js'
import PostDetailCoverImage from '../components/PostDetailCoverImage.js'
import PostDetailFooter from '../components/PostDetailFooter.js'
import PostDetailHeader from '../components/PostDetailHeader.js'
import PostDetailTopNavBar from '../components/PostDetailTopNavBar.js'
import ReadingProgressBar from '../components/ReadingProgressBar.js'
import RelatedPostsSection from '../components/RelatedPostsSection.js'

function PostDetailInner() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { post, loading, error } = usePost()
  const pageTitle = post?.title || t('postDetail.pageTitle', {}, { defaultValue: 'Post' })

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  return (
    <>
      <ReadingProgressBar />
      <PostDetailTopNavBar />
      <main aria-label={pageTitle} className={cm.cn(cm.sp('px', 6), 'pt-32 pb-20')}>
        {loading ? (
          <p
            data-mol-id="post-loading"
            className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-on-surface-variant')}
          >
            {t('postDetail.loading', {}, { defaultValue: 'Loading post…' })}
          </p>
        ) : error ? (
          <p
            data-mol-id="post-error"
            role="alert"
            className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-error')}
          >
            {error}
          </p>
        ) : post ? (
          <>
            <PostDetailHeader />
            <PostDetailCoverImage />
            <PostDetailArticleBody />
            <AuthorBioCard />
            <RelatedPostsSection />
          </>
        ) : null}
      </main>
      <PostDetailFooter />
    </>
  )
}

function PostDetail() {
  return (
    <PostProvider>
      <PostDetailInner />
    </PostProvider>
  )
}

export default PostDetail
export { PostDetail, PostDetail as PostDetailPage }
