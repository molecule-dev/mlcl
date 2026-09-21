import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { DiscoveryShell } from './components/DiscoveryShell.js'
import { EventTicketingLayout } from './components/EventTicketingLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { Attendees } from './pages/Attendees.js'
import { CreateEvent } from './pages/CreateEvent.js'
import { Dashboard } from './pages/Dashboard.js'
import { EditEvent } from './pages/EditEvent.js'
import { EventDetail } from './pages/EventDetail.js'
import { EventList } from './pages/EventList.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MyTickets } from './pages/MyTickets.js'
import { Notifications } from './pages/Notifications.js'
import { OrderConfirmation } from './pages/OrderConfirmation.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { TicketDetail } from './pages/TicketDetail.js'

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
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
