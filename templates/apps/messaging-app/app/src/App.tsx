import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { HushLayout } from './components/HushLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Archive = lazy(() => import('./pages/Archive.js').then((m) => ({ default: m.Archive })))
const ContactDetail = lazy(() =>
  import('./pages/ContactDetail.js').then((m) => ({ default: m.ContactDetail })),
)
const Contacts = lazy(() => import('./pages/Contacts.js').then((m) => ({ default: m.Contacts })))
const Conversation = lazy(() =>
  import('./pages/Conversation.js').then((m) => ({ default: m.Conversation })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GroupDetail = lazy(() =>
  import('./pages/GroupDetail.js').then((m) => ({ default: m.GroupDetail })),
)
const Groups = lazy(() => import('./pages/Groups.js').then((m) => ({ default: m.Groups })))
const Inbox = lazy(() => import('./pages/Inbox.js').then((m) => ({ default: m.Inbox })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewConversation = lazy(() =>
  import('./pages/NewConversation.js').then((m) => ({ default: m.NewConversation })),
)
const NewGroup = lazy(() => import('./pages/NewGroup.js').then((m) => ({ default: m.NewGroup })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
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
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
export function App() {
  return (
    <RootErrorBoundary>
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
                {/* Conversation has its own full-height layout */}
                <Route path="/conversations/:id" element={<Conversation />} />
                <Route element={<HushLayout />}>
                  <Route path="/inbox" element={<Inbox />} />
                  <Route path="/conversations/new" element={<NewConversation />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/contacts/:id" element={<ContactDetail />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/groups/new" element={<NewGroup />} />
                  <Route path="/groups/:id" element={<GroupDetail />} />
                  <Route path="/archive" element={<Archive />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
