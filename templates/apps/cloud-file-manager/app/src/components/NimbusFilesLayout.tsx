import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NimbusMobileNav, NimbusSideNav, useIsDesktop } from './NimbusSideNav.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated shell for cloud-file-manager — fixed sidebar (NimbusSideNav)
 * + main content with a sticky topbar exposing breadcrumbs, search, and a
 * view toggle, per DESIGN.md `### App Constraints`.
 *
 * Below 768px the sidebar is replaced by a hamburger + overlay drawer
 * (`NimbusMobileNav`) in the top bar — the fixed 260px rail would crush a
 * phone's content column. The two chrome modes are conditionally rendered,
 * never CSS-hidden, so `sidenav-*` locators stay unique.
 *
 * Wrap any auth'd page in `<NimbusFilesLayout breadcrumbs={...}>` to inherit
 * the chrome. Storage figures and the plan label are fetched from
 * `/api/stats` + `/api/billing/status` unless the page passes overrides.
 */
export interface BreadcrumbItem {
  to?: string
  label: string
}

export interface NimbusFilesLayoutProps {
  breadcrumbs?: BreadcrumbItem[]
  /** Optional element rendered to the right of the breadcrumbs (e.g. view toggle, primary action). */
  topbarRight?: ReactNode
  /** When false, hides the global search input in the topbar. */
  showSearch?: boolean
  usedBytes?: number
  totalBytes?: number
  planLabel?: string
  children: ReactNode
}

const DEFAULT_TOTAL = 200 * 1024 ** 3

/** Plan storage allowances by billing category — mirrors the Storage page. */
const PLAN_TOTALS: Record<string, number> = {
  free: 15 * 1024 ** 3,
  pro: 200 * 1024 ** 3,
  team: 2 * 1024 ** 4,
}

function formatPlanTotal(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(0)} TB`
  return `${Math.round(bytes / 1024 ** 3)} GB`
}

export function NimbusFilesLayout({
  breadcrumbs = [],
  topbarRight,
  showSearch = true,
  usedBytes,
  totalBytes,
  planLabel,
  children,
}: NimbusFilesLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isDesktop = useIsDesktop()

  const [fetchedUsed, setFetchedUsed] = useState<number | null>(null)
  const [plan, setPlan] = useState<{ name?: string; category?: string } | null>(null)

  // When the page doesn't supply real figures, fetch them so the sidebar
  // meter reflects the signed-in user instead of placeholder numbers.
  const wantsUsage = usedBytes === undefined
  const wantsPlan = planLabel === undefined
  useEffect(() => {
    if (!wantsUsage && !wantsPlan) return
    let cancelled = false
    Promise.all([
      wantsUsage
        ? http.get<{ usedBytes?: number }>('/api/stats').catch(() => null)
        : Promise.resolve(null),
      wantsPlan
        ? http.get<{ name?: string; category?: string }>('/api/billing/status').catch(() => null)
        : Promise.resolve(null),
    ]).then(([statsRes, statusRes]) => {
      if (cancelled) return
      if (statsRes?.data) setFetchedUsed(statsRes.data.usedBytes ?? 0)
      if (statusRes?.data) setPlan(statusRes.data)
    })
    return () => {
      cancelled = true
    }
  }, [http, wantsUsage, wantsPlan])

  const resolvedTotal =
    totalBytes ?? (plan?.category ? (PLAN_TOTALS[plan.category] ?? DEFAULT_TOTAL) : DEFAULT_TOTAL)
  const resolvedUsed = usedBytes ?? fetchedUsed ?? 0
  const resolvedPlanLabel =
    planLabel ??
    (plan?.name
      ? `${plan.name} · ${formatPlanTotal(resolvedTotal)}`
      : t('nimbusFilesLayout.defaultPlanLabel', {}, { defaultValue: 'Pro · 200 GB' }))

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <NimbusSideNav
        usedBytes={resolvedUsed}
        totalBytes={resolvedTotal}
        planLabel={resolvedPlanLabel}
      />
      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'md:ml-[260px]')}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            'px-4 md:px-8',
            cm.sp('py', 4),
            'sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'min-w-0 flex-1 md:flex-initial',
            )}
          >
            {!isDesktop && (
              <NimbusMobileNav
                usedBytes={resolvedUsed}
                totalBytes={resolvedTotal}
                planLabel={resolvedPlanLabel}
              />
            )}
            <nav
              aria-label={t(
                'nimbusFilesLayout.breadcrumbsLabel',
                {},
                { defaultValue: 'Breadcrumbs' },
              )}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                'min-w-0 overflow-x-auto',
              )}
            >
              {breadcrumbs.length === 0 ? (
                <span className="text-on-surface-variant">
                  {t('nimbusFilesLayout.defaultCrumb', {}, { defaultValue: 'Nimbus' })}
                </span>
              ) : (
                breadcrumbs.map((c, i) => {
                  const last = i === breadcrumbs.length - 1
                  // The app-name crumb is redundant behind the mobile drawer's
                  // brand — drop it below `sm` so short top bars (trash, upload)
                  // keep the meaningful crumb visible instead of truncating it.
                  const brandCrumb = i === 0 && breadcrumbs.length > 1
                  return (
                    <span
                      key={`${c.label}-${i}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        'shrink-0',
                        brandCrumb && 'hidden sm:flex',
                      )}
                    >
                      {c.to && !last ? (
                        <Link
                          to={c.to}
                          className={cm.cn(
                            cm.fontWeight('medium'),
                            'text-on-surface-variant hover:text-primary transition-colors',
                          )}
                        >
                          {c.label}
                        </Link>
                      ) : (
                        <span
                          className={cm.cn(
                            cm.fontWeight(last ? 'bold' : 'medium'),
                            last ? 'text-on-surface' : 'text-on-surface-variant',
                          )}
                        >
                          {c.label}
                        </span>
                      )}
                      {!last && <span className="text-on-surface-variant">›</span>}
                    </span>
                  )
                })
              )}
            </nav>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
            {showSearch && (
              <Link
                to="/search"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors w-72 hidden lg:flex',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-lg')}>search</span>
                <span>
                  {t('nimbusFilesLayout.searchPlaceholder', {}, { defaultValue: 'Search Nimbus…' })}
                </span>
              </Link>
            )}
            {topbarRight}
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className={cm.cn(cm.flex1, 'p-4 md:p-8', 'min-h-0')}>{children}</main>
      </div>
    </div>
  )
}
