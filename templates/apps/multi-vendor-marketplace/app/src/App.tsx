import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AppLayout } from './components/AppLayout.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Cart = lazy(() => import('./pages/Cart.js').then((m) => ({ default: m.Cart })))
const Catalog = lazy(() => import('./pages/Catalog.js').then((m) => ({ default: m.Catalog })))
const Checkout = lazy(() => import('./pages/Checkout.js').then((m) => ({ default: m.Checkout })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const OrderDetail = lazy(() =>
  import('./pages/OrderDetail.js').then((m) => ({ default: m.OrderDetail })),
)
const Orders = lazy(() => import('./pages/Orders.js').then((m) => ({ default: m.Orders })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ProductDetail = lazy(() =>
  import('./pages/ProductDetail.js').then((m) => ({ default: m.ProductDetail })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const VendorDashboard = lazy(() =>
  import('./pages/VendorDashboard.js').then((m) => ({ default: m.VendorDashboard })),
)
const VendorOnboarding = lazy(() =>
  import('./pages/VendorOnboarding.js').then((m) => ({ default: m.VendorOnboarding })),
)
const VendorOrders = lazy(() =>
  import('./pages/VendorOrders.js').then((m) => ({ default: m.VendorOrders })),
)
const VendorPayouts = lazy(() =>
  import('./pages/VendorPayouts.js').then((m) => ({ default: m.VendorPayouts })),
)
const VendorProductForm = lazy(() =>
  import('./pages/VendorProductForm.js').then((m) => ({ default: m.VendorProductForm })),
)
const VendorProducts = lazy(() =>
  import('./pages/VendorProducts.js').then((m) => ({ default: m.VendorProducts })),
)
const VendorStorefront = lazy(() =>
  import('./pages/VendorStorefront.js').then((m) => ({ default: m.VendorStorefront })),
)

export function App() {
  return (
    <BrowserRouter
      // Keep this: React Router 8 otherwise changes the URL before the new page renders,
      // so code and tests that check the page right after a navigation see the old one.
      useTransitions={false}
    >
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
            {/* Pages that render their own chrome — no shared shell */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/vendor/apply" element={<VendorOnboarding />} />
            <Route element={<AuthGuard />}>
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>

            {/* Public marketing & marketplace browse — under chrome */}
            <Route element={<AppLayout />}>
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/vendors/:slug" element={<VendorStorefront />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* Auth-required shopper & vendor routes */}
              <Route element={<AuthGuard />}>
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />

                {/* Vendor admin */}
                <Route path="/vendor/dashboard" element={<VendorDashboard />} />
                <Route path="/vendor/products" element={<VendorProducts />} />
                <Route path="/vendor/products/new" element={<VendorProductForm />} />
                <Route path="/vendor/products/:productId/edit" element={<VendorProductForm />} />
                <Route path="/vendor/orders" element={<VendorOrders />} />
                <Route path="/vendor/payouts" element={<VendorPayouts />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
