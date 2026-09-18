import { Router, Route } from '@solidjs/router'
import { MoleculeProvider } from '@molecule/app-solid'
import { getClient as getHttpClient } from '@molecule/app-http'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { AppLayout } from './components/AppLayout.js'
import { Login } from './pages/Login.js'
import { Signup } from './pages/Signup.js'
import { About } from './pages/About.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Home } from './pages/Home.js'
import { PlanUpdated } from './pages/PlanUpdated.js'

authClient.initialize().catch(() => {})

export function App() {
  return (
    <MoleculeProvider
      config={{
        auth: authClient,
        i18n: i18nProvider,
        theme: themeProvider,
        http: getHttpClient(),
        storage: getStorageProvider(),
      }}
    >
      <Router>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/about" component={About} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/" component={AuthGuard}>
          <Route path="/" component={AppLayout}>
            <Route path="/" component={Home} />
            <Route path="/plan-updated" component={PlanUpdated} />
          </Route>
        </Route>
      </Router>
    </MoleculeProvider>
  )
}
