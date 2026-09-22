import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
function FloatingUploadButton() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <Link
      className={cm.cn(
        'fixed bottom-20 md:bottom-8 right-4 md:right-8 h-14 px-5 md:px-6 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_12px_40px_rgba(15,15,35,0.15)] flex items-center gap-2 hover:scale-[1.02] active:scale-98 transition-all duration-200 z-50 group',
      )}
      to="/upload"
    >
      <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-y-0.5">
        cloud_upload
      </span>
      <span className={cm.cn(cm.fontWeight('medium'), 'tracking-wide')}>
        {t('floatingUploadButton.label', {}, { defaultValue: 'Upload Model' })}
      </span>
    </Link>
  )
}
export default FloatingUploadButton
export { FloatingUploadButton }
