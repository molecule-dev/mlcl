import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, useIsDesktop } from '@molecule/app-ui-react'

import { NimbusBrandLink, NimbusNavGroups, NimbusStorageCard } from './NimbusSideNav.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

/**
 * Authenticated shell for cloud-file-manager — the SHARED `ResponsiveAppShell`
 * from `@molecule/app-ui-react`, composed to Nimbus's chrome: the branded
 * sidebar (NimbusNavBody + storage card) beside a top bar carrying
 * breadcrumbs, search, and a view toggle, per DESIGN.md `### App Constraints`.
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint): the desktop Sidebar and the mobile Drawer (full APG dialog —
 * focus trap, Escape/backdrop close, scroll lock, auto-close on navigation)
 * receive the SAME nav element, and the mobile-only 44px menu trigger is
 * rendered by the shell's TopBar itself. The former hand-rolled fixed rail +
 * portal drawer (NimbusMobileNav/useIsDesktop) are deleted with the
 * migration.
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

  const storage = {
    usedBytes: resolvedUsed,
    totalBytes: resolvedTotal,
    planLabel: resolvedPlanLabel,
  }
  const navLabel = t('nimbusSideNav.primaryNavLabel', {}, { defaultValue: 'Primary navigation' })

  // Breadcrumbs — the top bar's leading slot on BOTH breakpoints (the shell
  // renders its menu trigger before it below 768px).
  const breadcrumbsNav = (
    <nav
      aria-label={t('nimbusFilesLayout.breadcrumbsLabel', {}, { defaultValue: 'Breadcrumbs' })}
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
          // The app-name crumb is redundant behind the brand — drop it below
          // `sm` so short top bars (trash, upload) keep the meaningful crumb
          // visible instead of truncating it.
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
  )

  // The shell's TopBar is mobile-only: a non-mobileOnly TopBar becomes a
  // squeezed flex-row COLUMN on desktop (the shared shell's documented
  // composition is mobileOnly + desktop chrome elsewhere). On desktop the
  // breadcrumbs + actions render as the content column's header strip —
  // only one copy mounts per breakpoint.
  const topActions = (
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
  )
  const isDesktop = useIsDesktop()

  return (
    <ResponsiveAppShell sidebarWidth={260} className="bg-background text-on-surface antialiased">
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={breadcrumbsNav}
        className="bg-surface/80 backdrop-blur-xl border-outline-variant/20"
        actions={topActions}
      />

      {/*
        Desktop sidebar (>=768px): brand + Library/Workspace groups + the
        storage card in the shell's footer row.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        dataMolId="nimbus-side-nav"
        className="bg-surface-container-low border-outline-variant/20 border-r"
        footer={<NimbusStorageCard {...storage} />}
      >
        <NimbusBrandLink />
        <NimbusNavGroups />
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's APG dialog over the SAME nav
        groups; brand in the header, storage card in the footer.
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        header={<NimbusBrandLink />}
        footer={<NimbusStorageCard {...storage} />}
        className="h-full bg-surface-container-low border-outline-variant/20 border-r"
      >
        <NimbusNavGroups />
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        {isDesktop && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'h-14 shrink-0 items-center border-b border-outline-variant/20 bg-surface/80 backdrop-blur-xl',
              'sticky top-0 z-20 px-4 md:px-8',
            )}
          >
            {breadcrumbsNav}
            {topActions}
          </div>
        )}
        <div className="p-4 md:p-8">{children}</div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
