import { Route, Router } from '@solidjs/router'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-solid'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { AppLayout } from './components/AppLayout.js'
import { About } from './pages/About.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Home } from './pages/Home.js'
import { Login } from './pages/Login.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'

// Pages are imported STATICALLY: every page is small (the whole page set is
// a few hundred KB of source) while a lazy page costs a serial chunk request
// after the entry executes. A full document load can land on ANY route here
// (a deep link, or a session restored from storage by `authClient.initialize()`),
// so no page can be moved off the first-paint path safely. Keep new routes static.
//
// `awaitSession` holds every page until a returning visitor's session is restored
// (one request after a full page load), so public pages read the restored user
// when that request succeeds. An 'unavailable' session still renders and may
// have a null user; handle that status separately from sign-out.
// A visitor with no session to restore makes no request. Keep it.
export function App() {
  return (
    <MoleculeProvider
      config={{
        auth: authClient,
        awaitSession: true,
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
            <Route path="/settings" component={Settings} />
            <Route path="/plan-updated" component={PlanUpdated} />
          </Route>
        </Route>
      </Router>
    </MoleculeProvider>
  )
}
