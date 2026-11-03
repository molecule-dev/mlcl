import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AppLayout } from './components/AppLayout.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Cart = lazyPage(() => import('./pages/Cart.js').then((m) => ({ default: m.Cart })))
const Catalog = lazyPage(() => import('./pages/Catalog.js').then((m) => ({ default: m.Catalog })))
const Checkout = lazyPage(() =>
  import('./pages/Checkout.js').then((m) => ({ default: m.Checkout })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const OrderDetail = lazyPage(() =>
  import('./pages/OrderDetail.js').then((m) => ({ default: m.OrderDetail })),
)
const Orders = lazyPage(() => import('./pages/Orders.js').then((m) => ({ default: m.Orders })))
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ProductDetail = lazyPage(() =>
  import('./pages/ProductDetail.js').then((m) => ({ default: m.ProductDetail })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const VendorDashboard = lazyPage(() =>
  import('./pages/VendorDashboard.js').then((m) => ({ default: m.VendorDashboard })),
)
const VendorOnboarding = lazyPage(() =>
  import('./pages/VendorOnboarding.js').then((m) => ({ default: m.VendorOnboarding })),
)
const VendorOrders = lazyPage(() =>
  import('./pages/VendorOrders.js').then((m) => ({ default: m.VendorOrders })),
)
const VendorPayouts = lazyPage(() =>
  import('./pages/VendorPayouts.js').then((m) => ({ default: m.VendorPayouts })),
)
const VendorProductForm = lazyPage(() =>
  import('./pages/VendorProductForm.js').then((m) => ({ default: m.VendorProductForm })),
)
const VendorProducts = lazyPage(() =>
  import('./pages/VendorProducts.js').then((m) => ({ default: m.VendorProducts })),
)
const VendorStorefront = lazyPage(() =>
  import('./pages/VendorStorefront.js').then((m) => ({ default: m.VendorStorefront })),
)

export function App() {
  return (
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
