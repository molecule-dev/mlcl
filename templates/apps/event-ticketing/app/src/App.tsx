import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { DiscoveryShell } from './components/DiscoveryShell.js'
import { EventTicketingLayout } from './components/EventTicketingLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Attendees = lazyPage(() =>
  import('./pages/Attendees.js').then((m) => ({ default: m.Attendees })),
)
const CreateEvent = lazyPage(() =>
  import('./pages/CreateEvent.js').then((m) => ({ default: m.CreateEvent })),
)
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const EditEvent = lazyPage(() =>
  import('./pages/EditEvent.js').then((m) => ({ default: m.EditEvent })),
)
const EventDetail = lazyPage(() =>
  import('./pages/EventDetail.js').then((m) => ({ default: m.EventDetail })),
)
const EventList = lazyPage(() =>
  import('./pages/EventList.js').then((m) => ({ default: m.EventList })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyTickets = lazyPage(() =>
  import('./pages/MyTickets.js').then((m) => ({ default: m.MyTickets })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const OrderConfirmation = lazyPage(() =>
  import('./pages/OrderConfirmation.js').then((m) => ({ default: m.OrderConfirmation })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TicketDetail = lazyPage(() =>
  import('./pages/TicketDetail.js').then((m) => ({ default: m.TicketDetail })),
)

export function App() {
  return (
    <RootErrorBoundary>
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
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              {/*
                Public discovery surface: anonymous visitors can browse events and
                view event details (read-only). Mutations like POST /api/orders
                still require auth and 401 anonymously, prompting login at the
                call site rather than gating the discovery experience.
              */}
              <Route element={<DiscoveryShell />}>
                <Route path="/events" element={<EventList />} />
                <Route path="/events/:id" element={<EventDetail />} />
              </Route>
              <Route element={<AuthGuard />}>
                <Route element={<EventTicketingLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/events/new" element={<CreateEvent />} />
                  <Route path="/events/:id/edit" element={<EditEvent />} />
                  <Route path="/events/:id/attendees" element={<Attendees />} />
                  <Route path="/my-tickets" element={<MyTickets />} />
                  <Route path="/orders/:id/confirmation" element={<OrderConfirmation />} />
                  <Route path="/tickets/:id" element={<TicketDetail />} />
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
