// index.html loads this entry. Add app startup code and stylesheet imports in main.tsx.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from '@molecule/app-routing-react-router'
import { App, AppRoot, routes } from './App.js'
import { RouteAccess } from './components/AuthGuard.js'
import { AppLayout } from './components/AppLayout.js'
import { initializeApp } from './main.js'

initializeApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoot>
        {/* Shell and access are independent: public pages keep navigation too. */}
        <AppLayout routes={routes}>
          <RouteAccess routes={routes}>
            <App />
          </RouteAccess>
        </AppLayout>
      </AppRoot>
    </BrowserRouter>
  </StrictMode>,
)
