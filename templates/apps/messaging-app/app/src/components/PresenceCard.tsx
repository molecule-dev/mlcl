import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AVATAR_BG } from '../lib/avatarColors.js'

interface Contact {
  id: string
  name: string
  initials: string
  avatar_index: number
  presence: 'online' | 'away' | 'offline'
  status: string | null
  safety_number_verified: boolean
}

interface PresenceCardProps {
  contacts: Contact[]
  /** Number to display next to the heading; defaults to contact count. */
  totalContacts?: number
}

const PRESENCE_LABEL: Record<Contact['presence'], string> = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
}

const PRESENCE_DOT: Record<Contact['presence'], string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-slate-400',
}

const PRESENCE_PILL: Record<Contact['presence'], string> = {
  online: 'bg-emerald-500/10 text-success',
  away: 'bg-amber-500/10 text-warning',
  offline: 'bg-slate-400/10 text-foreground-secondary',
}

/**
 * Companion sidebar card to ConversationList — surfaces friends' presence and
 * verification status. Translated from CRM's RecentActivities + team-chat's
 * SideNavBar avatar+presence pattern.
 */
export function PresenceCard({ contacts, totalContacts }: PresenceCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const top = contacts.slice(0, 5)
  const totalCount = totalContacts ?? contacts.length

  return (
    <div className={'rounded-2xl bg-surface-container-lowest p-5 shadow-sm'}>
      <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
        <h3 className={'text-sm font-extrabold uppercase tracking-widest text-on-surface-variant'}>
          {t('presenceCard.title', {}, { defaultValue: 'Contacts' })}
        </h3>
        <Link
          to="/contacts"
          className={'inline-block px-1 py-2.5 text-xs font-bold text-primary hover:underline'}
        >
          {t('presenceCard.viewAll', { count: totalCount }, { defaultValue: 'All {{count}} →' })}
        </Link>
      </div>

      {top.length === 0 ? (
        <p className={'text-xs text-on-surface-variant mt-4'}>
          {t('presenceCard.empty', {}, { defaultValue: 'Add contacts to see who’s around.' })}
        </p>
      ) : (
        <ul className={'mt-4 space-y-2'}>
          {top.map((c) => (
            <li key={c.id}>
              <Link
                to={`/contacts/${c.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'rounded-lg px-2 py-1.5 hover:bg-surface-container-low transition-colors',
                )}
              >
                <div className="relative shrink-0">
                  <div
                    className={
                      'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold'
                    }
                    style={{ backgroundColor: AVATAR_BG[c.avatar_index % AVATAR_BG.length] }}
                    aria-hidden="true"
                  >
                    {c.initials || c.name.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={cm.cn(
                      'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-container-lowest',
                      PRESENCE_DOT[c.presence],
                    )}
                    aria-hidden="true"
                  />
                </div>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div className={'flex items-center gap-1'}>
                    <p className={'text-sm font-semibold truncate text-on-surface'}>{c.name}</p>
                    {c.safety_number_verified && (
                      <span
                        className="material-symbols-outlined text-success text-[12px]"
                        aria-label={t(
                          'presenceCard.verifiedAria',
                          {},
                          { defaultValue: 'Verified' },
                        )}
                      >
                        verified
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant truncate">
                    {c.status ?? PRESENCE_LABEL[c.presence]}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0',
                    PRESENCE_PILL[c.presence],
                  )}
                >
                  {PRESENCE_LABEL[c.presence]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
