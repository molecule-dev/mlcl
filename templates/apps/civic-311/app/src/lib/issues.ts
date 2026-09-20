import { useTranslation } from '@molecule/app-react'

/** Shared domain vocabulary for issue categories and statuses. */

export const ISSUE_CATEGORIES = [
  'pothole',
  'streetlight',
  'graffiti',
  'trash',
  'tree',
  'parking',
  'other',
] as const

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]

export const ISSUE_STATUSES = [
  'submitted',
  'acknowledged',
  'in_review',
  'resolved',
  'dismissed',
] as const

export type IssueStatus = (typeof ISSUE_STATUSES)[number]

const CATEGORY_MATERIAL_ICONS: Record<IssueCategory, string> = {
  pothole: 'circle',
  streetlight: 'light',
  graffiti: 'brush',
  trash: 'delete',
  tree: 'park',
  parking: 'local_parking',
  other: 'help',
}

/** Material Symbols icon name for a category (rendered via the icon font). */
export function categoryIcon(category: string): string {
  return CATEGORY_MATERIAL_ICONS[category as IssueCategory] ?? 'help'
}

/** Use a category label hook so text flows through t(). */
export function useCategoryLabel(): (category: string) => string {
  const { t } = useTranslation()
  return (category: string) => {
    switch (category as IssueCategory) {
      case 'pothole':
        return t('category.pothole', {}, { defaultValue: 'Pothole' })
      case 'streetlight':
        return t('category.streetlight', {}, { defaultValue: 'Streetlight' })
      case 'graffiti':
        return t('category.graffiti', {}, { defaultValue: 'Graffiti' })
      case 'trash':
        return t('category.trash', {}, { defaultValue: 'Trash & dumping' })
      case 'tree':
        return t('category.tree', {}, { defaultValue: 'Tree' })
      case 'parking':
        return t('category.parking', {}, { defaultValue: 'Parking' })
      default:
        return t('category.other', {}, { defaultValue: 'Other' })
    }
  }
}

/** Use a status label hook so text flows through t(). */
export function useStatusLabel(): (status: string) => string {
  const { t } = useTranslation()
  return (status: string) => {
    switch (status as IssueStatus) {
      case 'submitted':
        return t('status.submitted', {}, { defaultValue: 'Submitted' })
      case 'acknowledged':
        return t('status.acknowledged', {}, { defaultValue: 'Acknowledged' })
      case 'in_review':
        return t('status.inReview', {}, { defaultValue: 'In review' })
      case 'resolved':
        return t('status.resolved', {}, { defaultValue: 'Resolved' })
      case 'dismissed':
        return t('status.dismissed', {}, { defaultValue: 'Dismissed' })
      default:
        return status
    }
  }
}

/** Relative "3d ago" style timestamp used across list rows and timelines. */
export function timeAgo(iso: string, t: ReturnType<typeof useTranslation>['t']): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) {
    const hours = Math.floor((Date.now() - then) / 3_600_000)
    if (hours <= 0) return t('common.timeAgo.now', {}, { defaultValue: 'just now' })
    return t('common.timeAgo.hours', { hours }, { defaultValue: '{{hours}}h ago' })
  }
  if (days === 1) return t('common.timeAgo.yesterday', {}, { defaultValue: 'yesterday' })
  return t('common.timeAgo.days', { days }, { defaultValue: '{{days}}d ago' })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
