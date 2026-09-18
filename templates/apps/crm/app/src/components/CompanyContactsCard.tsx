import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CompanyContact {
  id: string
  first_name: string
  last_name: string
  role: string | null
  email: string
}

function CompanyContactsCard({ contacts }: { contacts: CompanyContact[] }) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl shadow-[0px_12px_32px_rgba(19,47,106,0.06)] border-none',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          cm.flex({ align: 'center' }),
          'text-on-surface gap-2',
        )}
      >
        <span
          className={cm.cn(cm.textPrimary, 'material-symbols-outlined')}
          data-icon="contacts"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          contacts
        </span>
        {t('companyContactsCard.heading', {}, { defaultValue: 'Key Contacts' })}
      </h3>
      <div className={cm.stack(4)}>
        {contacts.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('companyContactsCard.empty', {}, { defaultValue: 'No contacts found.' })}
          </p>
        ) : (
          contacts.map((contact) => (
            <div key={contact.id} className={cm.flex({ align: 'center', justify: 'between' })}>
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
                <div
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'bg-border text-on-surface-variant',
                  )}
                >
                  {contact.first_name[0]}
                  {contact.last_name[0]}
                </div>
                <div>
                  <h4
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {contact.first_name} {contact.last_name}
                  </h4>
                  <p
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] text-on-surface-variant uppercase',
                    )}
                  >
                    {contact.role ?? ''}
                  </p>
                </div>
              </div>
              <a
                href={`mailto:${contact.email}`}
                aria-label={t(
                  'companyContactsCard.emailContact',
                  { firstName: contact.first_name, lastName: contact.last_name },
                  { defaultValue: 'Email {{firstName}} {{lastName}}' },
                )}
                className={cm.cn(
                  cm.sp('p', 2),
                  'rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                  data-icon="mail"
                >
                  mail
                </span>
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CompanyContactsCard
export { CompanyContactsCard }
