/**
 * The signed-in shell, on the shared `ResponsiveAppShell`
 * (`@molecule/app-ui-react`) — composed the fleet-canonical way: the brand
 * leads the desktop Sidebar, the mobile-only TopBar carries the menu trigger
 * (rendered by the shell when a Drawer is composed) plus the user menu,
 * notification and theme actions, and the SAME nav element is passed to
 * `.Sidebar` and `.Drawer` so only the mounted breakpoint's copy ever
 * instantiates (no duplicate landmarks, no double-mounted routes).
 *
 * This replaces the former template-local shell trio — `MobileNav` (hamburger
 * + drawer + escape/backdrop/scroll-lock handlers), the CSS-hidden desktop
 * asides (`hidden md:flex`) and the per-variant sidebars — with the shared
 * component's APG dialog drawer and breakpoint-owned mounting.
 *
 * Variants (the app's four sidebar shapes), all sharing one mobile chrome:
 * - {@link AppShell} — the default nav (`SideNavLinks` + progress footer);
 *   takes the desktop fixed header (`TopNavBar` / `SettingsTopNavBar`) as a
 *   slot, since it is md+-only non-duplicating chrome.
 * - {@link AssignmentsAppShell} — profile card + its own links.
 * - {@link DiscussionsAppShell} — its own links + the New-thread action.
 */
import type { CSSProperties, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'

import { useAuth, useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { planLabel } from '../lib/planLabel.js'
import { BrandWordmark } from './BrandWordmark.js'
import { SideNavFooter, SideNavLinks } from './SideNavBar.js'
import { UserMenu } from './UserMenu.js'

/** Props shared by every shell variant. */
interface ShellVariantProps {
  /** The routed page content — rendered inside the shell's `<main>`. */
  children: ReactNode
  /** Classes for the content `<main>` — page padding lives here. */
  contentClassName?: string
  /** Inline styles for the content `<main>`. */
  contentStyle?: CSSProperties
  /** `data-mol-id` for the content `<main>` (fleet locator convention). */
  contentMolId?: string
  /** Extra classes on the shell root (the old page wrapper's canvas/font). */
  className?: string
}

/** The old `MobileNav` bar's trailing actions — user menu, notifications, theme. */
function MobileTopBarActions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const iconButton = cm.cn(
    cm.sp('p', 2),
    cm.roundedFull,
    'text-foreground-secondary hover:bg-surface-secondary transition-colors',
  )

  return (
    <>
      <UserMenu dataMolId="user-menu-mobile" />
      <button
        type="button"
        className={cm.cn(
          iconButton,
          'relative min-h-[40px] min-w-[40px] flex items-center justify-center',
        )}
        data-mol-id="btn-notifications-mobile"
        aria-label={t('mobileNav.notifications', {}, { defaultValue: 'Notifications menu' })}
        onClick={() => navigate('/notifications')}
      >
        <span className={cm.cn('material-symbols-outlined')}>notifications</span>
        <span
          className={cm.cn(
            cm.w(2),
            cm.h(2),
            cm.roundedFull,
            'absolute top-2 right-2 bg-error border-2 border-surface',
          )}
        ></span>
      </button>
      <button
        type="button"
        className={cm.cn(iconButton, 'min-h-[40px] min-w-[40px] flex items-center justify-center')}
        data-mol-id="btn-theme-toggle-mobile"
        aria-label={t('mobileNav.toggleTheme', {}, { defaultValue: 'Toggle color theme' })}
        onClick={() => setTheme(theme?.mode === 'dark' ? 'light' : 'dark')}
      >
        <span className={cm.cn('material-symbols-outlined')}>
          {theme?.mode === 'dark' ? 'light_mode' : 'dark_mode'}
        </span>
      </button>
    </>
  )
}

/** The mobile bar's brand (kept from the old `MobileNav` header). */
function MobileBrand() {
  return (
    <Link
      to="/dashboard"
      className="min-w-0 truncate shrink-0"
      data-mol-id="mobile-nav-brand"
      aria-label={APP_NAME}
    >
      <BrandWordmark as="span" size="sm" />
    </Link>
  )
}

/** Drawer-header brand line (the old drawer's `sideNavBar.brandName` span). */
function DrawerBrand() {
  return <BrandWordmark as="span" />
}

/** The default desktop sidebar's brand line. */
function SidebarBrand() {
  return (
    <div className="mb-10">
      <BrandWordmark as="span" size="lg" />
    </div>
  )
}

/**
 * The default signed-in shell: desktop sidebar = brand + `SideNavLinks` +
 * progress footer; mobile drawer = the same nav + footer; the desktop fixed
 * header (`TopNavBar` / `SettingsTopNavBar`) rides in the `desktopTopBar`
 * slot as md+-only chrome.
 */
export function AppShell({
  desktopTopBar,
  contentClassName,
  contentStyle,
  contentMolId,
  className,
  children,
}: ShellVariantProps & { desktopTopBar?: ReactNode }) {
  return (
    <ResponsiveAppShell sidebarWidth={260} className={className}>
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={<MobileBrand />}
        actions={<MobileTopBarActions />}
      />
      {desktopTopBar}
      <ResponsiveAppShell.Sidebar footer={<SideNavFooter />}>
        <SidebarBrand />
        <SideNavLinks />
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer header={<DrawerBrand />} footer={<SideNavFooter />}>
        <SideNavLinks />
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content
        className={contentClassName}
        style={contentStyle}
        dataMolId={contentMolId}
      >
        {children}
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

// ---------------------------------------------------------------------------
// Assignments variant
// ---------------------------------------------------------------------------

/** The assignments sidebar's user profile card (verbatim from the old aside). */
function AssignmentsProfileCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string; email?: string; id?: string; planKey?: string }>()
  const userName =
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    t('assignmentsSideNavBar.guestUserName', {}, { defaultValue: 'Student' })
  const avatarSeed = user?.id || user?.email || 'student'
  const userPlanLabel = planLabel(user?.planKey)

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 4),
        cm.sp('py', 4),
        cm.sp('mb', 8),
        'bg-surface-secondary rounded-xl',
      )}
    >
      <div className={cm.cn('relative')}>
        <img
          alt={t(
            'assignmentsSideNavBar.userAvatarAlt',
            { name: userName },
            { defaultValue: '{{name}}' },
          )}
          className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
          src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}`}
        />
      </div>
      <div className={cm.flex({ direction: 'col' })}>
        <span
          className={cm.cn(
            cm.fontWeight('medium'),
            'font-sans antialiased text-foreground tracking-tight',
          )}
          data-mol-id="sidebar-user-name"
        >
          {userName}
        </span>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-wider text-foreground-secondary',
          )}
        >
          {t(
            'assignmentsSideNavBar.userPlanLabel',
            { plan: userPlanLabel },
            { defaultValue: '{{plan}} Plan' },
          )}
        </span>
      </div>
    </div>
  )
}

/** The assignments nav links — carried over from the former aside. */
function AssignmentsNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const active = {
    dashboard: pathname === '/' || pathname === '/dashboard',
    myCourses: pathname === '/courses' || pathname.startsWith('/course/'),
    assignments: pathname.startsWith('/assignments'),
    discussions: pathname.startsWith('/discussions'),
    gradebook: pathname.startsWith('/gradebook'),
    settings: pathname.startsWith('/settings'),
  }
  const navInactive = cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'text-foreground-secondary hover:text-foreground hover:bg-border/50 transition-colors duration-200',
  )
  const navActive = cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.fontWeight('semibold'),
    'text-violet-700 dark:text-violet-400 bg-surface dark:bg-violet-900/20 rounded-lg shadow-sm scale-95 transition-all duration-150',
  )

  return (
    <>
      <Link
        className={active.dashboard ? navActive : navInactive}
        to="/dashboard"
        aria-current={active.dashboard ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="dashboard"
          style={active.dashboard ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          dashboard
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            active.dashboard ? undefined : cm.fontWeight('medium'),
          )}
        >
          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </span>
      </Link>
      <Link
        className={active.myCourses ? navActive : navInactive}
        to="/courses"
        aria-current={active.myCourses ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="school"
          style={active.myCourses ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          school
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            active.myCourses ? undefined : cm.fontWeight('medium'),
          )}
        >
          {t('assignmentsSideNavBar.navMyCourses', {}, { defaultValue: 'My Courses' })}
        </span>
      </Link>
      <Link
        className={active.assignments ? navActive : navInactive}
        to="/assignments"
        aria-current={active.assignments ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="assignment"
          style={active.assignments ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          assignment
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            active.assignments ? undefined : cm.fontWeight('medium'),
          )}
        >
          {t('assignmentsSideNavBar.navAssignments', {}, { defaultValue: 'Assignments' })}
        </span>
      </Link>
      <Link
        className={active.discussions ? navActive : navInactive}
        to="/discussions"
        aria-current={active.discussions ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="forum"
          style={active.discussions ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          forum
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            active.discussions ? undefined : cm.fontWeight('medium'),
          )}
        >
          {t('assignmentsSideNavBar.navDiscussions', {}, { defaultValue: 'Discussions' })}
        </span>
      </Link>
      <Link
        className={cm.cn(active.gradebook ? navActive : navInactive, 'rounded-lg group')}
        to="/gradebook"
        aria-current={active.gradebook ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="grade"
          style={active.gradebook ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          grade
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            active.gradebook ? undefined : cm.fontWeight('medium'),
            'font-sans antialiased tracking-tight',
          )}
        >
          {t('assignmentsSideNavBar.navGradebook', {}, { defaultValue: 'Gradebook' })}
        </span>
      </Link>
      <Link
        className={cm.cn(
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('px', 4),
          'py-2.5 text-foreground-secondary hover:text-foreground hover:bg-border/50 transition-colors duration-200 rounded-lg group',
        )}
        to="/notifications"
      >
        <span className={cm.cn('material-symbols-outlined')} data-icon="notifications">
          notifications
        </span>
        <span className={cm.cn(cm.fontWeight('medium'), 'font-sans antialiased tracking-tight')}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </span>
      </Link>
      <Link
        className={cm.cn(
          active.settings ? navActive : navInactive,
          cm.sp('mt', 10),
          'py-2.5 rounded-lg group',
        )}
        to="/settings"
        aria-current={active.settings ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="settings"
          style={active.settings ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          settings
        </span>
        <span
          className={cm.cn(
            active.settings ? undefined : cm.fontWeight('medium'),
            'font-sans antialiased tracking-tight',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </span>
      </Link>
    </>
  )
}

/** The assignments sidebar's brand line. */
function AssignmentsSidebarBrand() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('mb', 10))}>
      <span
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          'tracking-tighter text-violet-700 dark:text-violet-400',
        )}
      >
        {t(
          'assignmentsSideNavBar.brandName',
          { appName: APP_NAME },
          { defaultValue: '{{appName}}' },
        )}
      </span>
    </div>
  )
}

/**
 * The assignments shell: brand + profile card + its own links in the desktop
 * sidebar; the drawer carries the same links plus the progress footer the
 * old mobile drawer always rendered.
 */
export function AssignmentsAppShell({
  contentClassName,
  contentStyle,
  contentMolId,
  className,
  children,
}: ShellVariantProps) {
  return (
    <ResponsiveAppShell sidebarWidth={260} className={className}>
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={<MobileBrand />}
        actions={<MobileTopBarActions />}
      />
      <ResponsiveAppShell.Sidebar>
        <AssignmentsSidebarBrand />
        <AssignmentsProfileCard />
        <AssignmentsNav />
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer header={<DrawerBrand />} footer={<SideNavFooter />}>
        <AssignmentsNav />
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content
        className={contentClassName}
        style={contentStyle}
        dataMolId={contentMolId}
      >
        {children}
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

// ---------------------------------------------------------------------------
// Discussions variant
// ---------------------------------------------------------------------------

/** The discussions nav links — carried over from the former aside. */
function DiscussionsNav() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const active = {
    dashboard: pathname === '/' || pathname === '/dashboard',
    myCourses: pathname === '/courses' || pathname.startsWith('/course/'),
    assignments: pathname.startsWith('/assignments'),
    discussions: pathname.startsWith('/discussions'),
    gradebook: pathname.startsWith('/gradebook'),
    settings: pathname.startsWith('/settings'),
  }
  const navInactive = cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'text-foreground-secondary hover:text-foreground hover:bg-border/50 transition-colors duration-200',
  )
  const navActive = cm.cn(
    cm.flex({ align: 'center', gap: 3 }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.fontWeight('semibold'),
    'text-violet-700 dark:text-violet-400 bg-surface rounded-lg shadow-sm scale-95 duration-150',
  )

  return (
    <>
      <Link
        className={active.dashboard ? navActive : navInactive}
        to="/dashboard"
        aria-current={active.dashboard ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="dashboard"
          style={active.dashboard ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          dashboard
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            active.dashboard ? undefined : cm.fontWeight('medium'),
            'font-sans antialiased tracking-tight',
          )}
        >
          {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
        </span>
      </Link>
      <Link
        className={active.myCourses ? navActive : navInactive}
        to="/courses"
        aria-current={active.myCourses ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="menu_book"
          style={active.myCourses ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          menu_book
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            active.myCourses ? undefined : cm.fontWeight('medium'),
            'font-sans antialiased tracking-tight',
          )}
        >
          {t('discussionsSideNavBar.myCourses', {}, { defaultValue: 'My Courses' })}
        </span>
      </Link>
      <Link
        className={active.assignments ? navActive : navInactive}
        to="/assignments"
        aria-current={active.assignments ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="assignment"
          style={active.assignments ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          assignment
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            active.assignments ? undefined : cm.fontWeight('medium'),
            'font-sans antialiased tracking-tight',
          )}
        >
          {t('nav.assignments', {}, { defaultValue: 'Assignments' })}
        </span>
      </Link>
      <Link
        className={active.discussions ? navActive : navInactive}
        to="/discussions"
        aria-current={active.discussions ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="forum"
          style={active.discussions ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          forum
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            active.discussions ? undefined : cm.fontWeight('medium'),
            'font-sans antialiased tracking-tight',
          )}
        >
          {t('discussionsSideNavBar.discussions', {}, { defaultValue: 'Discussions' })}
        </span>
      </Link>
      <Link
        className={active.gradebook ? navActive : navInactive}
        to="/gradebook"
        aria-current={active.gradebook ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="grade"
          style={active.gradebook ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          grade
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            active.gradebook ? undefined : cm.fontWeight('medium'),
            'font-sans antialiased tracking-tight',
          )}
        >
          {t('discussionsSideNavBar.gradebook', {}, { defaultValue: 'Gradebook' })}
        </span>
      </Link>
      <Link
        className={active.settings ? navActive : navInactive}
        to="/settings"
        aria-current={active.settings ? 'page' : undefined}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          data-icon="settings"
          style={active.settings ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          settings
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            active.settings ? undefined : cm.fontWeight('medium'),
            'font-sans antialiased tracking-tight',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </span>
      </Link>
    </>
  )
}

/** The discussions sidebar's brand line. */
function DiscussionsSidebarBrand() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), cm.sp('mb', 10))}>
      <span
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          'text-violet-700 dark:text-violet-400',
        )}
      >
        {t('discussionsSideNavBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
      </span>
    </div>
  )
}

/** The sidebar's full-width New-thread button (`btn-new-thread`, as before). */
function NewThreadButton({ onNewThread }: { onNewThread: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <button
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center', gap: 2 }),
        cm.sp('py', 3),
        cm.fontWeight('semibold'),
        cm.w('full'),
        'bg-primary hover:bg-primary-container text-on-primary rounded-xl shadow-lg shadow-primary/20 transition-all',
      )}
      data-mol-id="btn-new-thread"
      onClick={onNewThread}
    >
      <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} data-icon="add">
        add
      </span>
      {t('discussionsSideNavBar.newThread', {}, { defaultValue: 'New Thread' })}
    </button>
  )
}

/** The drawer's compact New-thread action (the old `btn-mobile-drawer-action`). */
function DrawerNewThreadAction({ onNewThread }: { onNewThread: () => void }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center', gap: 2 }),
        cm.sp('py', 3),
        cm.sp('mb', 4),
        cm.w('full'),
        cm.fontWeight('semibold'),
        cm.textSize('sm'),
        'rounded-lg scholar-gradient text-on-primary',
      )}
      data-mol-id="btn-mobile-drawer-action"
      onClick={onNewThread}
    >
      <span className={cm.cn('material-symbols-outlined text-[1.2rem]')} aria-hidden="true">
        edit
      </span>
      {t('discussionsSideNavBar.newThread', {}, { defaultValue: 'New Thread' })}
    </button>
  )
}

/**
 * The discussions shell: brand + its own links + the New-thread action in
 * the desktop sidebar; the drawer opens with the compact New-thread action
 * above the same links, plus the progress footer.
 */
export function DiscussionsAppShell({
  onNewThread,
  contentClassName,
  contentStyle,
  contentMolId,
  className,
  children,
}: ShellVariantProps & { onNewThread?: () => void }) {
  const drawerAction = onNewThread ? <DrawerNewThreadAction onNewThread={onNewThread} /> : null
  return (
    <ResponsiveAppShell sidebarWidth={260} className={className}>
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={<MobileBrand />}
        actions={<MobileTopBarActions />}
      />
      <ResponsiveAppShell.Sidebar
        footer={onNewThread ? <NewThreadButton onNewThread={onNewThread} /> : undefined}
      >
        <DiscussionsSidebarBrand />
        <DiscussionsNav />
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer header={<DrawerBrand />} footer={<SideNavFooter />}>
        {drawerAction}
        <DiscussionsNav />
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content
        className={contentClassName}
        style={contentStyle}
        dataMolId={contentMolId}
      >
        {children}
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
