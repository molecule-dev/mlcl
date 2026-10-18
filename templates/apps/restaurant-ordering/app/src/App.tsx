import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RestaurantOrderingLayout } from './components/RestaurantOrderingLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Analytics = lazy(() => import('./pages/Analytics.js').then((m) => ({ default: m.Analytics })))
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const CustomerDetail = lazy(() =>
  import('./pages/CustomerDetail.js').then((m) => ({ default: m.CustomerDetail })),
)
const Customers = lazy(() => import('./pages/Customers.js').then((m) => ({ default: m.Customers })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GuestCart = lazy(() => import('./pages/GuestCart.js').then((m) => ({ default: m.GuestCart })))
const GuestMenu = lazy(() => import('./pages/GuestMenu.js').then((m) => ({ default: m.GuestMenu })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Menu = lazy(() => import('./pages/Menu.js').then((m) => ({ default: m.Menu })))
const MenuItemDetail = lazy(() =>
  import('./pages/MenuItemDetail.js').then((m) => ({ default: m.MenuItemDetail })),
)
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const OrderDashboard = lazy(() =>
  import('./pages/OrderDashboard.js').then((m) => ({ default: m.OrderDashboard })),
)
const OrderDetail = lazy(() =>
  import('./pages/OrderDetail.js').then((m) => ({ default: m.OrderDetail })),
)
const OrderHistory = lazy(() =>
  import('./pages/OrderHistory.js').then((m) => ({ default: m.OrderHistory })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Reservations = lazy(() =>
  import('./pages/Reservations.js').then((m) => ({ default: m.Reservations })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TableDetail = lazy(() =>
  import('./pages/TableDetail.js').then((m) => ({ default: m.TableDetail })),
)
const Tables = lazy(() => import('./pages/Tables.js').then((m) => ({ default: m.Tables })))
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
              <Route path="/menu/guest" element={<GuestMenu />} />
              <Route path="/cart" element={<GuestCart />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route element={<AuthGuard />}>
                <Route element={<RestaurantOrderingLayout />}>
                  <Route path="/dashboard" element={<OrderDashboard />} />
                  <Route path="/menu" element={<Menu />} />
                  <Route path="/menu/:id" element={<MenuItemDetail />} />
                  <Route path="/orders/:id" element={<OrderDetail />} />
                  <Route path="/orders/history" element={<OrderHistory />} />
                  <Route path="/tables" element={<Tables />} />
                  <Route path="/tables/:id" element={<TableDetail />} />
                  <Route path="/reservations" element={<Reservations />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/:id" element={<CustomerDetail />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/billing" element={<Billing />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
