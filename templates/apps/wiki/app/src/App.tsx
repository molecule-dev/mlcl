import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { WikiLayout } from './components/WikiLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Comments = lazyPage(() =>
  import('./pages/Comments.js').then((m) => ({ default: m.Comments })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Home = lazyPage(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PageEditor = lazyPage(() =>
  import('./pages/PageEditor.js').then((m) => ({ default: m.PageEditor })),
)
const PageView = lazyPage(() =>
  import('./pages/PageView.js').then((m) => ({ default: m.PageView })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazyPage(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Spaces = lazyPage(() => import('./pages/Spaces.js').then((m) => ({ default: m.Spaces })))
const TeamMembers = lazyPage(() =>
  import('./pages/TeamMembers.js').then((m) => ({ default: m.TeamMembers })),
)
const Templates = lazyPage(() =>
  import('./pages/Templates.js').then((m) => ({ default: m.Templates })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Trash = lazyPage(() => import('./pages/Trash.js').then((m) => ({ default: m.Trash })))
const VersionHistory = lazyPage(() =>
  import('./pages/VersionHistory.js').then((m) => ({ default: m.VersionHistory })),
)
export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <AnalyticsRouteListener />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route element={<AuthGuard />}>
              {/* Standalone authed pages that render their own header/footer
                  (ContentPageShell) must sit OUTSIDE WikiLayout to avoid a
                  double header/sidebar. */}
              <Route path="/plan-updated" element={<PlanUpdated />} />
              <Route element={<WikiLayout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/spaces" element={<Spaces />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/comments" element={<Comments />} />
                <Route path="/team" element={<TeamMembers />} />
                <Route path="/trash" element={<Trash />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/page/new" element={<PageEditor />} />
                <Route path="/page/:id" element={<PageView />} />
                <Route path="/page/:id/edit" element={<PageEditor />} />
                <Route path="/page/:id/history" element={<VersionHistory />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
