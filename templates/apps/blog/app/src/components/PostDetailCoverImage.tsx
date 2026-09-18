import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { usePost } from './PostContext.js'

function PostDetailCoverImage() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const { post } = usePost()
  const cover = post?.cover_image_url
  if (!cover) return null
  return (
    <div className={cm.cn('max-w-[960px]', cm.mxAuto, cm.sp('mb', 16))}>
      <figure>
        <img
          alt={
            post?.title ??
            t('postDetailCoverImage.imageAlt', {}, { defaultValue: 'Article cover image' })
          }
          className={cm.cn(cm.w('full'), 'aspect-video object-cover rounded-lg shadow-sm')}
          src={cover}
          data-mol-id="post-cover-image"
        />
        {post?.title ? (
          <figcaption
            className={cm.cn(
              cm.sp('mt', 4),
              cm.textCenter,
              cm.textSize('xs'),
              'font-label text-on-surface-variant tracking-wide',
            )}
          >
            {post.title}
          </figcaption>
        ) : null}
      </figure>
    </div>
  )
}

export default PostDetailCoverImage
export { PostDetailCoverImage }
