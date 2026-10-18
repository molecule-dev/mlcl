import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { WikiLayout } from './components/WikiLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Comments = lazy(() => import('./pages/Comments.js').then((m) => ({ default: m.Comments })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Home = lazy(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PageEditor = lazy(() =>
  import('./pages/PageEditor.js').then((m) => ({ default: m.PageEditor })),
)
const PageView = lazy(() => import('./pages/PageView.js').then((m) => ({ default: m.PageView })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Spaces = lazy(() => import('./pages/Spaces.js').then((m) => ({ default: m.Spaces })))
const TeamMembers = lazy(() =>
  import('./pages/TeamMembers.js').then((m) => ({ default: m.TeamMembers })),
)
const Templates = lazy(() => import('./pages/Templates.js').then((m) => ({ default: m.Templates })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Trash = lazy(() => import('./pages/Trash.js').then((m) => ({ default: m.Trash })))
const VersionHistory = lazy(() =>
  import('./pages/VersionHistory.js').then((m) => ({ default: m.VersionHistory })),
)
export function App() {
  return (
    <BrowserRouter useTransitions={false}>
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
