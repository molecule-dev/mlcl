import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { displayName, type Person, yearsLabel } from '../lib/people.js'

export interface PersonCardProps {
  person: Person
  /** Highlight treatment for the tree's root person. */
  isRoot?: boolean
  /** Size variant — `tree` (compact node card) or `list` (directory row). */
  variant?: 'tree' | 'list'
}

function initials(p: Person): string {
  const a = p.first_name?.[0] ?? ''
  const b = p.last_name?.[0] ?? ''
  return (a + b).toUpperCase() || '?'
}

/**
 * Person card — the shared visual unit of the tree view and the people
 * directory. Initials avatar, archival-serif name, birth–death years, and a
 * deceased marker when a death date is recorded.
 */
export function PersonCard({ person, isRoot = false, variant = 'tree' }: PersonCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const years = yearsLabel(person)
  const deceased = Boolean(person.death_date)

  const avatar = (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.roundedFull,
        cm.fontWeight('bold'),
        isRoot ? 'text-white' : 'text-on-primary-container',
        variant === 'tree' ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm',
      )}
      style={{
        backgroundColor: isRoot ? 'var(--color-tree-root)' : 'var(--color-tree-root-bg)',
        fontFamily: 'var(--mol-font-tree)',
      }}
      aria-hidden="true"
    >
      {initials(person)}
    </div>
  )

  const nameLine = (
    <p
      className={cm.cn(
        cm.fontWeight('semibold'),
        'leading-tight',
        deceased && 'text-on-surface-variant',
      )}
      style={{ fontFamily: 'var(--mol-font-tree)' }}
    >
      {displayName(person)}
      {deceased && (
        <span
          className={cm.cn(cm.sp('ml', 1), cm.textSize('xs'))}
          title={t('personCard.deceased', {}, { defaultValue: 'Deceased' })}
        >
          †
        </span>
      )}
    </p>
  )

  if (variant === 'list') {
    return (
      <Link
        to={`/people/${person.id}`}
        data-mol-id={`person-card-${person.id}`}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('p', 4),
          'w-full rounded-xl bg-surface-container-lowest hover:shadow-md transition-all border border-outline-variant/10',
        )}
      >
        {avatar}
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          {nameLine}
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
            {years || t('personCard.yearsUnknown', {}, { defaultValue: 'Dates unknown' })}
          </p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/people/${person.id}`}
      data-mol-id={`person-card-${person.id}`}
      aria-label={t(
        'personCard.ariaLabel',
        { name: displayName(person), years },
        { defaultValue: '{{name}}{{years}} — view profile' },
      )}
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
        cm.sp('p', 3),
        'w-44 rounded-xl bg-surface-container-lowest hover:shadow-md transition-all border',
        isRoot ? 'border-primary shadow-md' : 'border-outline-variant/40',
      )}
    >
      {avatar}
      <div className={cm.cn(cm.textCenter)}>
        {nameLine}
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
          {years || t('personCard.yearsUnknown', {}, { defaultValue: 'Dates unknown' })}
        </p>
      </div>
    </Link>
  )
}

export default PersonCard
