import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { DigitalGoodsStoreLayout } from './components/DigitalGoodsStoreLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { Cart } from './pages/Cart.js'
import { Checkout } from './pages/Checkout.js'
import { CustomerLibrary } from './pages/CustomerLibrary.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { OrderConfirm } from './pages/OrderConfirm.js'
import { OrderHistory } from './pages/OrderHistory.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ProductDetail } from './pages/ProductDetail.js'
import { ProductEditor } from './pages/ProductEditor.js'
import { Products } from './pages/Products.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Sales } from './pages/Sales.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Storefront } from './pages/Storefront.js'
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
            <Route path="/shop" element={<Storefront />} />
            <Route path="/shop/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/:id/confirm" element={<OrderConfirm />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/plan-updated" element={<PlanUpdated />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route element={<AuthGuard />}>
              <Route element={<DigitalGoodsStoreLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/new" element={<ProductEditor />} />
                <Route path="/products/:id/edit" element={<ProductEditor />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/library" element={<CustomerLibrary />} />
                <Route path="/orders" element={<OrderHistory />} />
              </Route>
            </Route>
          </Routes>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
