import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { HushLayout } from './components/HushLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Archive = lazyPage(() => import('./pages/Archive.js').then((m) => ({ default: m.Archive })))
const ContactDetail = lazyPage(() =>
  import('./pages/ContactDetail.js').then((m) => ({ default: m.ContactDetail })),
)
const Contacts = lazyPage(() =>
  import('./pages/Contacts.js').then((m) => ({ default: m.Contacts })),
)
const Conversation = lazyPage(() =>
  import('./pages/Conversation.js').then((m) => ({ default: m.Conversation })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GroupDetail = lazyPage(() =>
  import('./pages/GroupDetail.js').then((m) => ({ default: m.GroupDetail })),
)
const Groups = lazyPage(() => import('./pages/Groups.js').then((m) => ({ default: m.Groups })))
const Inbox = lazyPage(() => import('./pages/Inbox.js').then((m) => ({ default: m.Inbox })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewConversation = lazyPage(() =>
  import('./pages/NewConversation.js').then((m) => ({ default: m.NewConversation })),
)
const NewGroup = lazyPage(() =>
  import('./pages/NewGroup.js').then((m) => ({ default: m.NewGroup })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
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
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter>
        <MoleculeProvider
          auth={authClient}
          awaitSession
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
