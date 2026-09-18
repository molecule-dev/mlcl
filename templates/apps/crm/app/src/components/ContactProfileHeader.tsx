import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ContactProfileHeaderProps {
  contact: {
    first_name: string
    last_name: string
    email: string
    phone: string | null
    title: string | null
    company_name: string | null
  }
}
function ContactProfileHeader({ contact }: ContactProfileHeaderProps) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <section className={cm.cn(cm.sp('px', 8), cm.sp('pt', 8), cm.sp('pb', 6), 'bg-surface')}>
      <div className={cm.flex({ align: 'start', justify: 'between' })}>
        <div className={cm.flex({ align: 'center', gap: 'lg' })}>
          <div
            className={cm.cn(
              cm.w(24),
              cm.h(24),
              'rounded overflow-hidden bg-surface-container-highest shadow-sm',
            )}
          >
            <img
              alt={contact.first_name + ' ' + contact.last_name}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              data-alt="professional headshot of a confident woman with glasses, smiling softly, neutral grey studio background, high-end corporate style"
              src="https://picsum.photos/seed/ContactProfileHeader-1/1200/800"
            />
          </div>
          <div>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <h1 className={cm.fvb4f5b4f0}>
                {contact.first_name} {contact.last_name}
              </h1>
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.fontWeight('bold'),
                  'py-0.5 bg-primary-container/10 text-primary text-[10px] uppercase tracking-widest rounded',
                )}
              >
                {t('contactProfileHeader.vipBadge', {}, { defaultValue: 'VIP Client' })}
              </span>
            </div>
            <p className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant')}>
              {[contact.title, contact.company_name].filter(Boolean).join(' • ')}
            </p>
            <div className={cm.cn(cm.flex({ gap: 'md' }), cm.sp('mt', 3))}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center' }),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    'material-symbols-outlined mr-1.5 text-primary',
                  )}
                >
                  mail
                </span>
                {contact.email}
              </div>
              {contact.phone && (
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center' }),
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      'material-symbols-outlined mr-1.5 text-primary',
                    )}
                  >
                    call
                  </span>
                  {contact.phone}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={cm.flex({ gap: 'sm' })}>
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'bg-surface-container-high text-primary rounded-lg hover:bg-surface-container-highest transition-colors',
            )}
            onClick={() => navigate('edit')}
          >
            {t('contactProfileHeader.editProfile', {}, { defaultValue: 'Edit Profile' })}
          </button>
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.flex({ align: 'center' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-lg shadow-sm hover:opacity-90 transition-opacity',
            )}
            onClick={() => {
              // TODO: wire when log-activity endpoint exists
            }}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined mr-1.5')}>
              add
            </span>
            {t('contactProfileHeader.logActivity', {}, { defaultValue: 'Log Activity' })}
          </button>
        </div>
      </div>
    </section>
  )
}

export default ContactProfileHeader
export { ContactProfileHeader }
