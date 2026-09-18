import { useEffect, useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface PostEditorBodyProps {
  setBody: (v: string) => void
  value?: string
}
function PostEditorBody({ setBody, value }: PostEditorBodyProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const divRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (divRef.current && value !== undefined && divRef.current.innerText !== value) {
      divRef.current.innerText = value
    }
  }, [value])
  return (
    <>
      {/* Content Area */}
      <div
        ref={divRef}
        className={cm.cn(
          cm.stack(8),
          cm.textSize('lg'),
          'font-body leading-relaxed text-on-surface focus:outline-none min-h-[12rem]',
        )}
        contentEditable="true"
        role="textbox"
        aria-multiline="true"
        aria-label={t('postEditorBody.bodyLabel', {}, { defaultValue: 'Post content' })}
        id="textarea-post-content"
        onInput={(e) => setBody((e.currentTarget as HTMLDivElement).innerText)}
      ></div>
    </>
  )
}

export default PostEditorBody
export { PostEditorBody }
