import { useTranslation } from '@molecule/app-react'

/**
 * A post's date as a `<time>` element, formatted for the current locale.
 * The same string renders at build time (Node, `en`) and on first paint, so
 * hydration matches; a locale switch re-renders it.
 */
export function PostDate({ date }: { date: string }) {
  const { locale } = useTranslation()
  const formatted = new Date(date).toLocaleDateString(locale || 'en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
  return (
    <time dateTime={date} data-mol-id="post-date">
      {formatted}
    </time>
  )
}
