import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface PostEditorAIButtonProps {
  onClick?: () => void
  disabled?: boolean
}
function PostEditorAIButton({ onClick, disabled }: PostEditorAIButtonProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <button
      className={cm.cn(
        'fixed bottom-12 right-12',
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 6),
        cm.sp('py', 4),
        cm.roundedFull,
        'bg-surface-container-highest shadow-xl hover:shadow-2xl transition-all duration-300 group z-50',
      )}
      id="button-ai-summarize"
      onClick={onClick}
      disabled={disabled}
    >
      <span className={cm.cn('material-symbols-outlined', cm.textPrimary)} data-icon="magic_button">
        magic_button
      </span>
      <span
        className={cm.cn(
          'font-label',
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'text-on-surface',
        )}
      >
        {t('postEditorAIButton.aiSummarize', {}, { defaultValue: 'AI Assist' })}
      </span>
    </button>
  )
}

export default PostEditorAIButton
export { PostEditorAIButton }
