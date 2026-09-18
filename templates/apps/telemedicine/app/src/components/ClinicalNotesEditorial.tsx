import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Patient {
  id: string
  name: string
  dob: string
  age: number
  sex: 'M' | 'F' | 'X'
  primary_concern: string
  last_visit: string | null
  next_visit: string | null
  flag: 'none' | 'urgent' | 'new' | 'overdue'
}

interface ClinicalNotesEditorialProps {
  patients: Patient[]
}

const FLAG_PILL: Record<Patient['flag'], { bg: string; label: string }> = {
  none: { bg: 'bg-surface-container text-on-surface-variant', label: 'Active' },
  urgent: { bg: 'bg-error/10 text-error', label: 'Urgent' },
  new: { bg: 'bg-info/10 text-info', label: 'New' },
  overdue: { bg: 'bg-warning/10 text-warning', label: 'Overdue' },
}

const FLAG_DOT: Record<Patient['flag'], string> = {
  none: 'bg-on-surface-variant text-surface',
  urgent: 'bg-error text-on-error',
  new: 'bg-primary text-on-primary',
  overdue: 'bg-warning text-on-surface',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Editorial patient activity feed translated from CRM's
 * RecentActivities pattern. Avatar disk colored by flag tone (urgent/new/
 * overdue), bold name, age/sex meta, primary concern body, last/next-visit
 * meta strip in mono. Flag pill on the right.
 */
export function ClinicalNotesEditorial({ patients }: ClinicalNotesEditorialProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (patients.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t('clinicalNotesEditorial.empty', {}, { defaultValue: 'No patients to show.' })}
      </p>
    )
  }

  return (
    <ul className={'space-y-1'}>
      {patients.map((p) => {
        const initial = p.name.charAt(0).toUpperCase()
        const flag = FLAG_PILL[p.flag]
        return (
          <li key={p.id}>
            <Link
              to={`/patients`}
              className={cm.cn(
                cm.flex({ align: 'start', gap: 'md' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl hover:bg-surface-container-low transition-colors',
              )}
            >
              <div
                className={cm.cn(
                  'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  FLAG_DOT[p.flag],
                )}
                aria-hidden="true"
              >
                {initial}
              </div>
              <div className={cm.cn(cm.flex1, 'min-w-0')}>
                <div className={'flex items-baseline gap-2 flex-wrap'}>
                  <p className={'text-sm font-extrabold text-on-surface truncate'}>{p.name}</p>
                  <span className="text-[11px] font-mono text-on-surface-variant tabular-nums">
                    {t(
                      'clinicalNotesEditorial.demo',
                      { age: p.age, sex: p.sex },
                      { defaultValue: '{{age}} {{sex}}' },
                    )}
                  </span>
                </div>
                <p
                  className={'text-sm text-on-surface-variant line-clamp-1 mt-0.5 leading-relaxed'}
                >
                  {p.primary_concern}
                </p>
                <div
                  className={
                    'flex items-center gap-2 mt-1.5 text-[10px] font-mono text-on-surface-variant tabular-nums'
                  }
                >
                  <span>
                    {t(
                      'clinicalNotesEditorial.lastVisit',
                      { date: fmtDate(p.last_visit) },
                      { defaultValue: 'Last {{date}}' },
                    )}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t(
                      'clinicalNotesEditorial.nextVisit',
                      { date: fmtDate(p.next_visit) },
                      { defaultValue: 'Next {{date}}' },
                    )}
                  </span>
                </div>
              </div>
              <span
                className={cm.cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0',
                  flag.bg,
                )}
              >
                {flag.label}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
