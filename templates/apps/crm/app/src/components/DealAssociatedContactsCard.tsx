import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function DealAssociatedContactsCard({
  contacts,
}: {
  contacts: {
    id: string
    first_name: string
    last_name: string
    email: string
    role: string | null
  }[]
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <>
      {/* Associated Contacts Card */}
      <div
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-3xl architectural-shadow',
        )}
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 6))}>
          <h3
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-outline',
            )}
          >
            {t('dealAssociatedContactsCard.title', {}, { defaultValue: 'Associated Contacts' })}
          </h3>
          {/* TODO: wire when add-contact flow exists (open modal or navigate to contact picker) */}
          <span
            className={cm.cn(
              cm.cursorPointer,
              'material-symbols-outlined text-outline hover:text-primary',
            )}
          >
            person_add
          </span>
        </div>
        <div className={cm.stack(5)}>
          {contacts.length === 0 ? (
            <p className={cm.cn(cm.textSize('xs'), 'text-outline')}>
              {t(
                'dealAssociatedContactsCard.empty',
                {},
                { defaultValue: 'No contacts associated.' },
              )}
            </p>
          ) : (
            contacts.map((contact) => (
              <div key={contact.id} className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
                <div
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    cm.textPrimary,
                    'bg-surface-container-high',
                  )}
                >
                  {contact.first_name[0]}
                  {contact.last_name[0]}
                </div>
                <div className={cm.fvb42feb5d}>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {contact.first_name} {contact.last_name}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-outline')}>
                    {contact.role ?? t('nav.contact', {}, { defaultValue: 'Contact' })}
                  </p>
                </div>
                <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()}>
                  <span
                    className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined text-outline')}
                  >
                    mail
                  </span>
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

export default DealAssociatedContactsCard
export { DealAssociatedContactsCard }
