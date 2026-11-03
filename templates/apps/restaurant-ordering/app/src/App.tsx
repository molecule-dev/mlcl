import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RestaurantOrderingLayout } from './components/RestaurantOrderingLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Analytics = lazyPage(() =>
  import('./pages/Analytics.js').then((m) => ({ default: m.Analytics })),
)
const Billing = lazyPage(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const CustomerDetail = lazyPage(() =>
  import('./pages/CustomerDetail.js').then((m) => ({ default: m.CustomerDetail })),
)
const Customers = lazyPage(() =>
  import('./pages/Customers.js').then((m) => ({ default: m.Customers })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GuestCart = lazyPage(() =>
  import('./pages/GuestCart.js').then((m) => ({ default: m.GuestCart })),
)
const GuestMenu = lazyPage(() =>
  import('./pages/GuestMenu.js').then((m) => ({ default: m.GuestMenu })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Menu = lazyPage(() => import('./pages/Menu.js').then((m) => ({ default: m.Menu })))
const MenuItemDetail = lazyPage(() =>
  import('./pages/MenuItemDetail.js').then((m) => ({ default: m.MenuItemDetail })),
)
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const OrderDashboard = lazyPage(() =>
  import('./pages/OrderDashboard.js').then((m) => ({ default: m.OrderDashboard })),
)
const OrderDetail = lazyPage(() =>
  import('./pages/OrderDetail.js').then((m) => ({ default: m.OrderDetail })),
)
const OrderHistory = lazyPage(() =>
  import('./pages/OrderHistory.js').then((m) => ({ default: m.OrderHistory })),
)
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Reservations = lazyPage(() =>
  import('./pages/Reservations.js').then((m) => ({ default: m.Reservations })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TableDetail = lazyPage(() =>
  import('./pages/TableDetail.js').then((m) => ({ default: m.TableDetail })),
)
const Tables = lazyPage(() => import('./pages/Tables.js').then((m) => ({ default: m.Tables })))
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
