import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RestaurantOrderingLayout } from './components/RestaurantOrderingLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { Analytics } from './pages/Analytics.js'
import { Billing } from './pages/Billing.js'
import { CustomerDetail } from './pages/CustomerDetail.js'
import { Customers } from './pages/Customers.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { GuestCart } from './pages/GuestCart.js'
import { GuestMenu } from './pages/GuestMenu.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Menu } from './pages/Menu.js'
import { MenuItemDetail } from './pages/MenuItemDetail.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { OrderDashboard } from './pages/OrderDashboard.js'
import { OrderDetail } from './pages/OrderDetail.js'
import { OrderHistory } from './pages/OrderHistory.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { Reservations } from './pages/Reservations.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { TableDetail } from './pages/TableDetail.js'
import { Tables } from './pages/Tables.js'
import { Terms } from './pages/Terms.js'

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
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
