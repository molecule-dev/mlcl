/**
 * Integration tests for the `mlcl create` command.
 *
 * Validates:
 * 1. Template files exist for all 5 app frameworks
 * 2. Templates use correct molecule UI components
 * 3. SvelteKit-specific template structure
 * 4. Template variable substitution
 * 5. create.ts framework-specific config generation
 *
 * @module
 */

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'
import { afterAll, describe, expect, it } from 'vitest'

import { copyTemplateFiles } from '../scaffold.js'
import { readAppTemplate } from './helpers/app-templates.js'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES = join(ROOT, 'templates', 'app')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A template as a scaffold with every optional feature writes it (its feature folder included). */
async function readTemplate(framework: string, ...path: string[]): Promise<string> {
  return readAppTemplate(framework, path.join('/'))
}

async function listTemplateFiles(framework: string): Promise<string[]> {
  const files: string[] = []
  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), `${prefix}${entry.name}/`)
      } else {
        files.push(`${prefix}${entry.name}`)
      }
    }
  }
  await walk(join(TEMPLATES, framework), '')
  return files.sort()
}

/** Check executable factory calls; package guidance may show the same calls in comments. */
function providerCreationCalls(content: string): string[] {
  const factories = new Set([
    'createJWTAuthClient',
    'createCSSVariablesThemeProvider',
    'createSimpleI18nProvider',
  ])
  const calls: string[] = []
  const source = ts.createSourceFile('config.ts', content, ts.ScriptTarget.ES2022, true)
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      factories.has(node.expression.text)
    ) {
      calls.push(node.expression.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return calls
}

// ---------------------------------------------------------------------------
// Template inventory tests
// ---------------------------------------------------------------------------

describe('Template file inventory', () => {
  it('shared config template has pure config values (no provider creation)', async () => {
    const content = await readFile(join(TEMPLATES, 'shared', 'config.ts.tpl'), 'utf-8')
    expect(content).toContain('authConfig')
    // Auth, theme, and i18n providers are all in bond setup files, not config
    expect(providerCreationCalls(content)).toEqual([])
  })

  it('emits currentUserEndpoint beside the other auth endpoints (xr-molecule-flash-m159)', async () => {
    // m159: an app rewrote its authConfig with loginEndpoint/registerEndpoint and
    // omitted the current-user route, so the client's `/users/me` default answered
    // 404 on reload. Emitting the route in the scaffolded config — named as the
    // route `validateSession()` calls — keeps it in view when the file is rewritten.
    const root = await mkdtemp(join(tmpdir(), 'mlcl-current-user-config-'))
    try {
      await copyTemplateFiles(root, 'react', 'current-user-config')
      const content = await readFile(join(root, 'src', 'config.ts'), 'utf-8')
      expect(content).toContain("currentUserEndpoint: '/users/me'")
      const at = content.indexOf('currentUserEndpoint:')
      // Inside the authConfig object, beside login/register (not somewhere else).
      expect(at).toBeGreaterThan(content.indexOf('loginEndpoint:'))
      expect(at).toBeLessThan(content.indexOf('autoRefresh'))
      expect(content.slice(0, at)).toContain('validateSession()')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('React has 20 template files', async () => {
    const files = await listTemplateFiles('react')
    expect(files).toEqual([
      'App.tsx.tpl',
      'bootstrap.tsx.tpl',
      'components/AppLayout.tsx.tpl',
      'components/AuthGuard.tsx.tpl',
      'components/FloatingInput.tsx.tpl',
      'components/Header.tsx.tpl',
      'components/Icon.tsx.tpl',
      'components/UserMenu.tsx.tpl',
      'features/emails/pages/ForgotPassword.tsx.tpl',
      'features/emails/pages/ResetPassword.tsx.tpl',
      'features/footer/components/Footer.tsx.tpl',
      'features/footer/pages/About.tsx.tpl',
      'features/oauth/components/OAuthButtons.tsx.tpl',
      'features/payments/pages/PlanUpdated.tsx.tpl',
      'features/settings/components/SettingsPanel.tsx.tpl',
      'features/settings/pages/Settings.tsx.tpl',
      'main.tsx.tpl',
      'pages/Home.tsx.tpl',
      'pages/Login.tsx.tpl',
      'pages/Signup.tsx.tpl',
    ])
  })

  it('a static site removes every React app page it does not provide itself', async () => {
    // `applyStaticSiteOverlay` copies the static pages over the app scaffold's, then deletes
    // STATIC_SITE_REMOVES. An app page in neither set ships in every static site, unrouted,
    // importing the auth client.
    const scaffold = await readFile(join(ROOT, 'src', 'lib', 'scaffold.ts'), 'utf-8')
    const start = scaffold.indexOf('const STATIC_SITE_REMOVES = [')
    expect(start).toBeGreaterThan(-1)
    const removes = scaffold.slice(start, scaffold.indexOf(']', start))
    const staticPages = await readdir(join(ROOT, 'templates', 'static', 'react', 'pages'))
    // A feature's pages (`features/<feature>/pages/`) land in `pages/` too.
    const appPages = (await listTemplateFiles('react'))
      .map((file) => file.replace(/^features\/[^/]+\//, ''))
      .filter((file) => file.startsWith('pages/'))
    expect(appPages.length).toBeGreaterThan(0)
    const shipped = appPages.filter(
      (file) =>
        !staticPages.includes(file.slice('pages/'.length)) &&
        !removes.includes(`'src/${file.replace(/\.tpl$/, '')}'`),
    )
    expect(shipped).toEqual([])
  })

  it('Vue has 20 template files', async () => {
    const files = await listTemplateFiles('vue')
    expect(files).toEqual([
      'App.vue.tpl',
      'components/AppLayout.vue.tpl',
      'components/AuthGuard.ts.tpl',
      'components/FloatingInput.ts.tpl',
      'components/Header.vue.tpl',
      'components/Icon.ts.tpl',
      'components/ThemeToggle.ts.tpl',
      'components/UserMenu.vue.tpl',
      'features/emails/pages/ForgotPassword.vue.tpl',
      'features/emails/pages/ResetPassword.vue.tpl',
      'features/footer/components/Footer.vue.tpl',
      'features/footer/pages/About.vue.tpl',
      'features/oauth/components/OAuthButtons.vue.tpl',
      'features/payments/pages/PlanUpdated.vue.tpl',
      'features/settings/components/SettingsPanel.vue.tpl',
      'features/settings/pages/Settings.vue.tpl',
      'main.ts.tpl',
      'pages/Home.vue.tpl',
      'pages/Login.vue.tpl',
      'pages/Signup.vue.tpl',
    ])
  })

  it('Svelte has 19 SvelteKit template files', async () => {
    const files = await listTemplateFiles('svelte')
    expect(files).toEqual([
      'components/AppLayout.svelte.tpl',
      'components/Header.svelte.tpl',
      'components/RouteAccess.svelte.tpl',
      'components/UserMenu.svelte.tpl',
      'features/emails/routes/forgot-password/+page.svelte.tpl',
      'features/emails/routes/reset-password/+page.svelte.tpl',
      'features/footer/components/Footer.svelte.tpl',
      'features/footer/routes/about/+page.svelte.tpl',
      'features/oauth/components/OAuthButtons.svelte.tpl',
      'features/payments/routes/plan-updated/+page.svelte.tpl',
      'features/settings/components/SettingsPanel.svelte.tpl',
      'features/settings/routes/settings/+page.svelte.tpl',
      'hooks.client.ts.tpl',
      'lib/logo.ts.tpl',
      'routes/+layout.svelte.tpl',
      'routes/+layout.ts.tpl',
      'routes/+page.svelte.tpl',
      'routes/login/+page.svelte.tpl',
      'routes/signup/+page.svelte.tpl',
    ])
  })

  it('Solid has 20 template files', async () => {
    // The Solid template is the file-by-file port of the React one: the app
    // shell, settings sections, OAuth row/logos, profile form and submit-error
    // envelope come from the framework's shared packages, so the template keeps
    // exactly React's file inventory in Solid's idiom.
    const files = await listTemplateFiles('solid')
    expect(files).toEqual([
      'App.tsx.tpl',
      'components/AppLayout.tsx.tpl',
      'components/AuthGuard.tsx.tpl',
      'components/FloatingInput.tsx.tpl',
      'components/Header.tsx.tpl',
      'components/Icon.tsx.tpl',
      'components/ThemeToggle.tsx.tpl',
      'components/UserMenu.tsx.tpl',
      'features/emails/pages/ForgotPassword.tsx.tpl',
      'features/emails/pages/ResetPassword.tsx.tpl',
      'features/footer/components/Footer.tsx.tpl',
      'features/footer/pages/About.tsx.tpl',
      'features/oauth/components/OAuthButtons.tsx.tpl',
      'features/payments/pages/PlanUpdated.tsx.tpl',
      'features/settings/components/SettingsPanel.tsx.tpl',
      'features/settings/pages/Settings.tsx.tpl',
      'main.tsx.tpl',
      'pages/Home.tsx.tpl',
      'pages/Login.tsx.tpl',
      'pages/Signup.tsx.tpl',
    ])
  })

  it('Angular has 20 template files', async () => {
    const files = await listTemplateFiles('angular')
    expect(files).toEqual([
      'app.component.ts.tpl',
      'components/app-layout.component.ts.tpl',
      'components/auth.guard.ts.tpl',
      'components/floating-input.component.ts.tpl',
      'components/header.component.ts.tpl',
      'components/icon.component.ts.tpl',
      'components/theme-toggle.component.ts.tpl',
      'components/user-menu.component.ts.tpl',
      'features/emails/pages/forgot-password.component.ts.tpl',
      'features/emails/pages/reset-password.component.ts.tpl',
      'features/footer/components/footer.component.ts.tpl',
      'features/footer/pages/about.component.ts.tpl',
      'features/oauth/components/oauth-buttons.component.ts.tpl',
      'features/payments/pages/plan-updated.component.ts.tpl',
      'features/settings/components/settings-panel.component.ts.tpl',
      'features/settings/pages/settings.component.ts.tpl',
      'main.ts.tpl',
      'pages/home.component.ts.tpl',
      'pages/login.component.ts.tpl',
      'pages/signup.component.ts.tpl',
    ])
  })
})

// ---------------------------------------------------------------------------
// Molecule UI component usage
// ---------------------------------------------------------------------------

describe('Templates use molecule UI components', () => {
  describe('React', () => {
    it('Login uses @molecule/app-ui-react', async () => {
      const content = await readTemplate('react', 'pages', 'Login.tsx.tpl')
      expect(content).toContain("from '@molecule/app-ui-react'")
      expect(content).toContain('Button')
      expect(content).toContain('FloatingInput')
    })

    it('Home uses @molecule/app-react', async () => {
      const content = await readTemplate('react', 'pages', 'Home.tsx.tpl')
      expect(content).toContain("from '@molecule/app-react'")
      expect(content).toContain('useAuth')
    })

    it('Header wraps the shared AppHeader from molecule', async () => {
      const content = await readTemplate('react', 'components', 'Header.tsx.tpl')
      expect(content).toContain("from '@molecule/app-header-react'")
      expect(content).toContain('AppHeader')
    })

    it('SettingsPanel composes the shared settings-panel sections', async () => {
      const content = await readTemplate('react', 'components', 'SettingsPanel.tsx.tpl')
      expect(content).toContain("from '@molecule/app-settings-panel-react'")
      expect(content).toContain('SettingsContainer')
      expect(content).toContain('AccountSection')
    })
  })

  describe('Vue', () => {
    it('Login uses @molecule/app-ui-vue', async () => {
      const content = await readTemplate('vue', 'pages', 'Login.vue.tpl')
      expect(content).toContain("from '@molecule/app-ui-vue'")
      expect(content).toContain('Button')
      expect(content).toContain('FloatingInput')
    })

    it('Home uses @molecule/app-vue', async () => {
      const content = await readTemplate('vue', 'pages', 'Home.vue.tpl')
      expect(content).toContain("from '@molecule/app-vue'")
      expect(content).toContain('useAuth')
    })

    it('Header wraps the shared AppHeader from molecule', async () => {
      const content = await readTemplate('vue', 'components', 'Header.vue.tpl')
      expect(content).toContain("from '@molecule/app-header-vue'")
      expect(content).toContain('AppHeader')
    })

    it('SettingsPanel composes the shared settings-panel sections', async () => {
      const content = await readTemplate('vue', 'components', 'SettingsPanel.vue.tpl')
      expect(content).toContain("from '@molecule/app-settings-panel-vue'")
      expect(content).toContain('SettingsContainer')
      expect(content).toContain('AccountSection')
    })
  })

  describe('Svelte', () => {
    it('Login uses the shared @molecule/app-ui-svelte components', async () => {
      const content = await readTemplate('svelte', 'routes', 'login', '+page.svelte.tpl')
      expect(content).toContain("from '@molecule/app-ui'")
      expect(content).toContain('getClassMap')
      // The form fields are the shared package's FloatingInput, the same
      // component @molecule/app-ui-react ships (no scaffold-local wrapper).
      expect(content).toContain("from '@molecule/app-ui-svelte'")
      expect(content).toContain('FloatingInput')
    })

    it('Home uses @molecule/app-svelte', async () => {
      const content = await readTemplate('svelte', 'routes', '+page.svelte.tpl')
      expect(content).toContain("from '@molecule/app-svelte'")
      expect(content).toContain('useAuth')
    })

    it('Header and Footer wrap the shared molecule shell packages', async () => {
      // The chrome (logo <img>, brand link, fixed positioning, About/legal
      // links, language picker, version) renders inside the shared packages —
      // exactly what the React template gets from app-header/footer-react.
      const header = await readTemplate('svelte', 'components', 'Header.svelte.tpl')
      expect(header).toContain("from '@molecule/app-header-svelte'")
      expect(header).toContain('AppHeader')
      expect(header).toContain('UserMenu')

      const footer = await readTemplate('svelte', 'components', 'Footer.svelte.tpl')
      expect(footer).toContain("from '@molecule/app-footer-svelte'")
      expect(footer).toContain('AppFooter')
      expect(footer).toContain('loadContent')

      const layout = await readTemplate('svelte', 'components', 'AppLayout.svelte.tpl')
      expect(layout).toContain("from '@molecule/app-shell-layout-svelte'")
      expect(layout).toContain('AppShellLayout')
      expect(layout).toContain('Header')
      expect(layout).toContain('Footer')
    })

    it('SettingsPanel composes the shared settings-panel sections', async () => {
      const content = await readTemplate('svelte', 'components', 'SettingsPanel.svelte.tpl')
      expect(content).toContain("from '@molecule/app-settings-panel-svelte'")
      expect(content).toContain('SettingsContainer')
      expect(content).toContain('AccountSection')
      // The panel reads the drawer's close callback from the shared
      // panel-close context, exactly as the React panel reads usePanelClose().
      expect(content).toContain('usePanelClose')
    })

    it('OAuthButtons wraps the shared auth-ui package', async () => {
      const content = await readTemplate('svelte', 'components', 'OAuthButtons.svelte.tpl')
      expect(content).toContain("from '@molecule/app-auth-ui-svelte'")
      expect(content).toContain('oauthConfig')
    })
  })

  describe('Solid', () => {
    it('Login uses @molecule/app-ui-solid', async () => {
      const content = await readTemplate('solid', 'pages', 'Login.tsx.tpl')
      expect(content).toContain("from '@molecule/app-ui-solid'")
      expect(content).toContain('Button')
      expect(content).toContain('FloatingInput')
    })

    it('Home uses @molecule/app-solid', async () => {
      const content = await readTemplate('solid', 'pages', 'Home.tsx.tpl')
      expect(content).toContain("from '@molecule/app-solid'")
      expect(content).toContain('useAuth')
    })

    it('Header delegates the chrome to @molecule/app-header-solid', async () => {
      // The branded header (logo <img>, fixed bar, theme toggle slot) renders
      // inside the shared AppHeader; the template only injects branding and
      // the user menu.
      const content = await readTemplate('solid', 'components', 'Header.tsx.tpl')
      expect(content).toContain("from '@molecule/app-header-solid'")
      expect(content).toContain('AppHeader')
      expect(content).toContain('UserMenu')
    })
  })

  describe('Angular', () => {
    it('Login uses the Angular UI package Form, Button and FloatingInput', async () => {
      const content = await readTemplate('angular', 'pages', 'login.component.ts.tpl')
      // Buttons and the form come from @molecule/app-ui-angular, whose
      // `button[mol-button]` host IS the <button> and whose `form[mol-form]`
      // renders the rejected-submit error list + pending fieldset, so data-mol-id
      // and aria labels land on the real control. The floating input is the shared
      // `FloatingInput` re-exported by the scaffold's component shim, as react's
      // pages import it from their own shim.
      expect(content).toContain("from '@molecule/app-ui-angular'")
      expect(content).toContain('mol-button')
      expect(content).not.toContain('appButton')
      expect(content).toContain('mol-form')
      expect(content).toContain('onFormSubmit')
      expect(content).toContain('FloatingInput')
      expect(content).toContain('mol-floating-input')
      expect(content).not.toContain('app-floating-input')
      const input = await readTemplate('angular', 'components', 'floating-input.component.ts.tpl')
      // The shim is the shared component (the ClassMap styling lives in the
      // UI package now, exactly as in react's one-line shim).
      expect(input).toContain("export { FloatingInput } from '@molecule/app-ui-angular'")
      // The page still drives auth through @molecule/app-angular.
      expect(content).toContain("from '@molecule/app-angular'")
      expect(content).toContain('useLogin')
    })

    it('Header wraps the shared AppHeader from molecule', async () => {
      const content = await readTemplate('angular', 'components', 'header.component.ts.tpl')
      // The header chrome (bar, logo <img>, theme toggle slot) renders inside
      // @molecule/app-header-angular; the wrapper only injects branding and
      // the user menu, as react's Header.tsx does.
      expect(content).toContain("from '@molecule/app-header-angular'")
      expect(content).toContain('mol-app-header')
      expect(content).toContain('APP_NAME')
      expect(content).toContain('LOGO_SIZE')
    })
  })
})

// ---------------------------------------------------------------------------
// SvelteKit-specific structure
// ---------------------------------------------------------------------------

describe('SvelteKit template structure', () => {
  it('hooks.client.ts initializes providers and auth from bonds', async () => {
    const content = await readTemplate('svelte', 'hooks.client.ts.tpl')
    expect(content).toContain('setupProviders()')
    expect(content).toContain('authClient.initialize()')
    expect(content).toContain("from '#lib/bonds/index.js'")
    // authClient now comes from bonds, not config
    expect(content).not.toContain("from '#lib/config.js'")
  })

  it('+layout.ts disables SSR', async () => {
    const content = await readTemplate('svelte', 'routes', '+layout.ts.tpl')
    expect(content).toContain('export const ssr = false')
  })

  it('+layout.svelte sets up molecule context', async () => {
    const content = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
    expect(content).toContain('setMoleculeContext')
    expect(content).toContain("from '@molecule/app-svelte'")
    // authClient and themeProvider both come from bonds
    expect(content).toContain("from '#lib/bonds/index.js'")
    expect(content).not.toContain("from '#lib/config.js'")
    expect(content).toContain('authClient')
    expect(content).toContain('themeProvider')
  })

  it('+layout.svelte uses Svelte 5 runes', async () => {
    const layout = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
    expect(layout).toContain('$props()')
    expect(layout).toContain('{@render children()}')
    // The reactive redirect is a rune ($effect) inside the shared
    // @molecule/app-ui-svelte AuthGuard, which the scaffold's RouteAccess composes.
    const access = await readTemplate('svelte', 'components', 'RouteAccess.svelte.tpl')
    expect(access).toContain("from '@molecule/app-ui-svelte'")
    expect(access).toContain('AuthGuard')
  })

  it('+layout.svelte has the access boundary and app layout', async () => {
    const layout = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
    // The layout composes the RouteAccess boundary around the routed page;
    // the header/footer shell renders inside it for the private routes.
    expect(layout).toContain("import RouteAccess from '../components/RouteAccess.svelte'")
    expect(layout).toMatch(/<RouteAccess>\s*\{@render children\(\)\}\s*<\/RouteAccess>/s)
    // The render gate is the `sessionReady` store (status left 'loading'), not
    // `initialized` — a stored token AND user make the first render 'authenticated'
    // (xr-molecule-flash-m177), and a returning visitor's pages wait for the restore.
    expect(layout).toContain('{#if $sessionReady}')
    expect(layout).toMatch(/const \{[^}]*\bsessionReady\b[^}]*\} = createAuthStores\(/s)
    expect(layout).not.toContain('$authState.initialized')

    // The access policy lives in RouteAccess: the public paths render bare,
    // everything else renders inside the shared AuthGuard and the app shell.
    const access = await readTemplate('svelte', 'components', 'RouteAccess.svelte.tpl')
    expect(access).toContain("import AppLayout from './AppLayout.svelte'")
    expect(access).toMatch(/<AuthGuard>\s*<AppLayout>/s)
    expect(access).toContain('matchPath(view.path, $location.pathname)')
    expect(access).toContain('const privateViews: readonly RouteView[] = []')

    // Branding moved into the shell's header component.
    const header = await readTemplate('svelte', 'components', 'Header.svelte.tpl')
    expect(header).toContain('APP_NAME')

    // Logout moved into the shared settings panel's log-out section.
    const panel = await readTemplate('svelte', 'components', 'SettingsPanel.svelte.tpl')
    expect(panel).toContain('LogOutDeleteSection')
  })

  it('+page.svelte shows user greeting (Home)', async () => {
    const content = await readTemplate('svelte', 'routes', '+page.svelte.tpl')
    expect(content).toContain('useAuth')
    expect(content).toContain('$user')
    expect(content).toContain("t('home.greeting')")
  })

  it('login/+page.svelte has login form', async () => {
    const content = await readTemplate('svelte', 'routes', 'login', '+page.svelte.tpl')
    expect(content).toContain('useLogin')
    expect(content).toContain('$state(')
    expect(content).toContain('await login(')
    // Post-login navigation routes to the location the auth guard stashed in
    // `state.from`, not a literal '/'. The same effect routes in when an OAuth
    // callback completes on this page.
    expect(content).toContain('navigate(from, { replace: true })')
    expect(content).toContain('if ($isAuthenticated) navigate(')
  })

  it('no old standalone Svelte files remain', async () => {
    const files = await listTemplateFiles('svelte')
    // Should NOT contain old standalone Svelte files
    expect(files).not.toContain('main.ts.tpl')
    expect(files).not.toContain('App.svelte.tpl')
    // pages/ directory should not exist (SvelteKit uses routes/ instead)
    expect(files.some((f) => f.includes('pages/'))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Framework-specific patterns
// ---------------------------------------------------------------------------

describe('Framework-specific patterns', () => {
  it('React uses react-router for routing', async () => {
    const app = await readTemplate('react', 'App.tsx.tpl')
    expect(app).toContain("from 'react-router'")
    expect(app).toContain('useRoutes(routes)')
    // The entry point mounts the router around <App />, so a rewrite of App's providers
    // cannot drop it (b5d987c42b: P461 l3540's rewrite left a blank page behind a green check).
    const entry = await readTemplate('react', 'bootstrap.tsx.tpl')
    expect(entry).toMatch(/<BrowserRouter>[\s\S]*<App \/>[\s\S]*<\/BrowserRouter>/)
    expect(app).not.toContain('BrowserRouter')
    // Pages wait for the initial restore to settle, so public actions see the
    // restored user when that request succeeds.
    expect(app).toMatch(/<MoleculeProvider\s[^>]*\bawaitSession\b/)
    expect(await readTemplate('react-native-web', 'App.tsx.tpl')).toMatch(
      /<MoleculeProvider\s[^>]*\bawaitSession\b/,
    )

    // react now shims the shared AuthGuard from @molecule/app-ui-react
    // (the Navigate/Outlet routing logic lives in the shared component).
    const guard = await readTemplate('react', 'components', 'AuthGuard.tsx.tpl')
    expect(guard).toContain('AuthGuard')
    expect(guard).toMatch(/@molecule\/app-ui-react|Navigate/)
  })

  it('Vue uses vue-router for routing', async () => {
    const main = await readTemplate('vue', 'main.ts.tpl')
    expect(main).toContain("from 'vue-router'")
    expect(main).toContain('createRouter')
    expect(main).toContain('createWebHistory')
    // Pages render only once a returning visitor's session is restored, inside
    // the app's own access boundary.
    const vueApp = await readTemplate('vue', 'App.vue.tpl')
    expect(vueApp).toContain("import { SessionReady } from '@molecule/app-vue'")
    expect(vueApp).toMatch(
      /<SessionReady>\s*<RouteAccess>\s*<RouterView \/>\s*<\/RouteAccess>\s*<\/SessionReady>/,
    )

    // vue now shims the shared AuthGuard from @molecule/app-ui-vue (the
    // redirect/route-element logic lives in the shared component), and the
    // template's RouteAccess policy judges by `status` only.
    const guard = await readTemplate('vue', 'components', 'AuthGuard.ts.tpl')
    expect(guard).toContain('AuthGuard')
    expect(guard).toMatch(/@molecule\/app-ui-vue/)
    // The policy waits on `status`, not `initialized`: a stored token AND user
    // make the first render 'authenticated' (xr-molecule-flash-m177).
    expect(guard).toContain("status.value === 'unavailable'")
    expect(guard).not.toContain('initialized')
  })

  it('Svelte uses SvelteKit file-based routing', async () => {
    const files = await listTemplateFiles('svelte')
    expect(files).toContain('routes/+layout.svelte.tpl')
    expect(files).toContain('routes/+page.svelte.tpl')
    expect(files).toContain('routes/login/+page.svelte.tpl')
    // No client-side router library
    const layout = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
    expect(layout).toContain("from '$app/state'")
    // Kit's base path (or `#` under hash routing) reaches the router as the root href.
    expect(layout).toContain("rootHref: resolve('/')")
    // The molecule Router over SvelteKit's navigation is built in the layout
    // (it watches kit's page from the component that builds it); in-app
    // navigation routes through it, exactly as the React scaffold's
    // BrowserRouter does.
    expect(layout).toContain("from '$app/navigation'")
    expect(layout).toContain('createSvelteKitRouter(')
    expect(layout).toContain('createSvelteKitNavigation(')
    // app-routing-sveltekit 3 reads kit's `navigating` state; it no longer takes `afterNavigate`.
    expect(layout).toContain('createSvelteKitNavigation({ goto, page, navigating, rootHref')
    expect(layout).not.toContain('afterNavigate')
  })

  it('Solid uses @solidjs/router for routing', async () => {
    const app = await readTemplate('solid', 'App.tsx.tpl')
    expect(app).toContain("from '@solidjs/router'")
    expect(app).toContain('Router')
    expect(app).toContain('Route')
    expect(app).toMatch(/config=\{\{[^}]*\bawaitSession:\s*true\b/s)
    // The access boundary wraps the routed tree inside the providers (react's
    // RouteAccess position): private routes hold behind the shared guard, and
    // only the policy's declared public views pass.
    expect(app).toContain('RouteAccess')

    // The guard file keeps the shared AuthGuard (loading tag + redirect live
    // inside it) and the app's RouteAccess policy: an unavailable session is
    // not sign-out — it renders the LoadErrorBanner with a retry instead of
    // redirecting, and a pattern-match against the bonded router decides the
    // public views.
    const guard = await readTemplate('solid', 'components', 'AuthGuard.tsx.tpl')
    expect(guard).toContain("export { AuthGuard } from '@molecule/app-ui-solid'")
    expect(guard).toContain('RouteAccess')
    expect(guard).toContain('LoadErrorBanner')
    expect(guard).toContain("status() === 'unavailable'")
    expect(guard).toContain('matchPath')
    // No hand-written redirect: holding and redirecting is the shared guard's job.
    expect(guard).not.toContain('<Navigate')
  })

  it('Angular uses @angular/router for routing', async () => {
    const main = await readTemplate('angular', 'main.ts.tpl')
    expect(main).toContain("from '@angular/router'")
    expect(main).toContain('provideRouter')
    expect(main).toContain('Routes')
    expect(main).toMatch(/provideMolecule\(\{[^}]*\bawaitSession:\s*true\b/s)

    // The guard is a route COMPONENT now (the port of react's AuthGuard route
    // element), and it keeps the SHARED guard: the loading tag while the status
    // is 'loading' and the /login redirect carrying state.from are the shared
    // component's branches (react re-exports the same component from
    // @molecule/app-ui-react). An 'unavailable' session is not sign-out: the
    // load-error banner replaces the guard, with the client's validation as Retry.
    const guard = await readTemplate('angular', 'components', 'auth.guard.ts.tpl')
    expect(guard).toContain('AuthGuardComponent')
    expect(guard).toContain('RouterOutlet')
    expect(guard).toContain("export { AuthGuard } from '@molecule/app-ui-angular'")
    expect(guard).toContain('<mol-auth-guard')
    expect(guard).toContain('loginPath="/login"')
    expect(guard).toContain("=== 'unavailable'")
    expect(guard).toContain('mol-load-error-banner')
    expect(guard).toContain('validateSession')
    expect(guard).toContain('publicViews')
    expect(guard).toContain('privateViews')
  })

  it('React Native Web guard waits on the session status, not `initialized`', async () => {
    const guard = await readTemplate('react-native-web', 'components', 'AuthGuard.tsx.tpl')
    expect(guard).toContain("status === 'loading'")
    expect(guard).not.toContain('state.initialized')
  })
})

// ---------------------------------------------------------------------------
// Template variable substitution
// ---------------------------------------------------------------------------

describe('Template variable substitution', () => {
  it('shared config has pure config values and no provider creation', async () => {
    const content = await readFile(join(TEMPLATES, 'shared', 'config.ts.tpl'), 'utf-8')
    expect(content).toContain('authConfig')
    // Config should not create any providers — those are in bond setup files
    expect(providerCreationCalls(content)).toEqual([])
  })

  it('shared branding.ts.tpl uses {{PROJECT_NAME}} and documents generate-icons', async () => {
    const content = await readFile(join(TEMPLATES, 'shared', 'branding.ts.tpl'), 'utf-8')
    expect(content).toContain('{{PROJECT_NAME}}')
    expect(content).toContain('APP_NAME')
    expect(content).toContain('LOGO_SIZE')
    expect(content).toContain('WEBSITE_URL')
    expect(content).toContain('APP_DESCRIPTION')
    expect(content).toContain('BRAND_COLOR')
    expect(content).toContain('generate-icons')
    expect(content).toContain('logo.svg')
    // LOGO_ICON and AUTH_LOGO_ICON were removed — logos use <img> tags now
    expect(content).not.toContain('LOGO_ICON')
    expect(content).not.toContain('AUTH_LOGO_ICON')
  })

  it('shared logo.svg.tpl is a valid 32x32 SVG', async () => {
    const content = await readFile(join(TEMPLATES, 'shared', 'logo.svg.tpl'), 'utf-8')
    expect(content).toContain('viewBox="0 0 32 32"')
    expect(content).toContain('<svg')
    expect(content).toContain('</svg>')
    // No template variables — static logo
    const matches = content.match(/\{\{([A-Z_]+)\}\}/g) || []
    expect(matches).toEqual([])
  })

  it('shared generate-icons.mjs.tpl has BRANDING_PATH, PUBLIC_DIR, HTML_PATH template vars', async () => {
    const content = await readFile(join(TEMPLATES, 'shared', 'generate-icons.mjs.tpl'), 'utf-8')
    expect(content).toContain('{{BRANDING_PATH}}')
    expect(content).toContain('{{PUBLIC_DIR}}')
    expect(content).toContain('{{HTML_PATH}}')
    const uniqueVars = [...new Set(content.match(/\{\{([A-Z_]+)\}\}/g) || [])]
    expect(uniqueVars.sort()).toEqual(['{{BRANDING_PATH}}', '{{HTML_PATH}}', '{{PUBLIC_DIR}}'])
  })

  it('generate-icons.mjs.tpl reads branding values and updates index.html', async () => {
    const content = await readFile(join(TEMPLATES, 'shared', 'generate-icons.mjs.tpl'), 'utf-8')
    // Reads all three branding values
    expect(content).toContain("readConst('APP_NAME'")
    expect(content).toContain("readConst('APP_DESCRIPTION'")
    expect(content).toContain("readConst('BRAND_COLOR'")
    // Updates index.html meta tags
    expect(content).toContain('theme-color')
    expect(content).toContain('og:title')
    expect(content).toContain('og:description')
    expect(content).toContain('twitter:title')
    expect(content).toContain('twitter:description')
    expect(content).toContain('apple-mobile-web-app-title')
    expect(content).toContain('<title>')
  })

  it('favicon.svg.tpl does not exist (replaced by logo.svg copy)', async () => {
    const exists = await readFile(join(TEMPLATES, 'shared', 'favicon.svg.tpl'), 'utf-8').then(
      () => true,
      () => false,
    )
    expect(exists).toBe(false)
  })

  it('SVG templates use {{LOGO_CONTENT}} placeholder', async () => {
    const icon = await readFile(join(TEMPLATES, 'shared', 'icon.svg.tpl'), 'utf-8')
    expect(icon).toContain('{{LOGO_CONTENT}}')

    const splash = await readFile(join(TEMPLATES, 'shared', 'splash.svg.tpl'), 'utf-8')
    expect(splash).toContain('{{LOGO_CONTENT}}')

    const ogImage = await readFile(join(TEMPLATES, 'shared', 'og-image.svg.tpl'), 'utf-8')
    expect(ogImage).toContain('{{LOGO_CONTENT}}')
  })

  it('React Header imports branding constants and passes them to AppHeader', async () => {
    // The logo <img> itself now renders inside @molecule/app-header-react;
    // the template just injects branding constants into the wrapper.
    const content = await readTemplate('react', 'components', 'Header.tsx.tpl')
    expect(content).toContain("from '../branding.js'")
    expect(content).toContain('APP_NAME')
    expect(content).toContain('LOGO_SIZE')
  })

  it('React auth pages receive branding from the entry shell', async () => {
    const entry = await readTemplate('react', 'bootstrap.tsx.tpl')
    expect(entry).toContain('<AppLayout routes={routes}>')
    for (const page of ['Login', 'Signup', 'ForgotPassword', 'ResetPassword']) {
      const content = await readTemplate('react', 'pages', page + '.tsx.tpl')
      expect(content).not.toContain('<header')
      expect(content).not.toContain('<Footer')
    }
  })

  it('all frameworks import branding in Header', async () => {
    const reactHeader = await readTemplate('react', 'components', 'Header.tsx.tpl')
    expect(reactHeader).toContain("from '../branding.js'")

    const vueHeader = await readTemplate('vue', 'components', 'Header.vue.tpl')
    expect(vueHeader).toContain("from '../branding.js'")

    const solidHeader = await readTemplate('solid', 'components', 'Header.tsx.tpl')
    expect(solidHeader).toContain("from '../branding.js'")

    const angularHeader = await readTemplate('angular', 'components', 'header.component.ts.tpl')
    expect(angularHeader).toContain("from '../branding.js'")

    const svelteHeader = await readTemplate('svelte', 'components', 'Header.svelte.tpl')
    expect(svelteHeader).toContain("from '#lib/branding.js'")
  })

  it('all frameworks use img logo in Header', async () => {
    // react delegates Header chrome (incl. the logo <img>) to the shared
    // @molecule/app-header-react AppHeader component.
    const reactHeader = await readTemplate('react', 'components', 'Header.tsx.tpl')
    expect(reactHeader).toContain('@molecule/app-header-react')
    expect(reactHeader).not.toContain('LOGO_ICON')

    // vue delegates Header chrome (incl. the logo <img>) to the shared
    // @molecule/app-header-vue AppHeader component, as react does; its logoSrc
    // defaults to /logo.svg and the wrapper passes logoSize.
    const vueHeader = await readTemplate('vue', 'components', 'Header.vue.tpl')
    expect(vueHeader).toContain('@molecule/app-header-vue')
    expect(vueHeader).toContain('LOGO_SIZE')
    expect(vueHeader).not.toContain('LOGO_ICON')

    // solid delegates Header chrome (incl. the logo <img>) to the shared
    // @molecule/app-header-solid AppHeader component, as react does.
    const solidHeader = await readTemplate('solid', 'components', 'Header.tsx.tpl')
    expect(solidHeader).toContain('@molecule/app-header-solid')
    expect(solidHeader).not.toContain('LOGO_ICON')

    // angular delegates Header chrome (incl. the logo <img>) to the shared
    // @molecule/app-header-angular AppHeader component, as react does; its
    // logoSrc defaults to /logo.svg and the wrapper passes logoSize.
    const angularHeader = await readTemplate('angular', 'components', 'header.component.ts.tpl')
    expect(angularHeader).toContain('@molecule/app-header-angular')
    expect(angularHeader).toContain('LOGO_SIZE')
    expect(angularHeader).not.toContain('LOGO_ICON')

    // svelte delegates the header chrome (incl. the logo <img>) to the shared
    // @molecule/app-header-svelte AppHeader component; the pages that render
    // the logo themselves keep lib/logo.ts, which assembles the `/logo.svg`
    // path (a plain literal trips the root-relative-assets build guard —
    // SvelteKit writes TWO output directories).
    const svelteHeader = await readTemplate('svelte', 'components', 'Header.svelte.tpl')
    expect(svelteHeader).toContain('@molecule/app-header-svelte')
    expect(svelteHeader).not.toContain('LOGO_ICON')
    const svelteLogo = await readTemplate('svelte', 'lib', 'logo.ts.tpl')
    expect(svelteLogo).toContain("'logo.svg'")
  })

  it('standalone auth pages use img logos', async () => {
    const authPages: Record<string, string[]> = {
      vue: ['Login.vue.tpl', 'Signup.vue.tpl', 'ForgotPassword.vue.tpl', 'ResetPassword.vue.tpl'],
      solid: ['Login.tsx.tpl', 'Signup.tsx.tpl', 'ForgotPassword.tsx.tpl', 'ResetPassword.tsx.tpl'],
      angular: [
        'login.component.ts.tpl',
        'signup.component.ts.tpl',
        'forgot-password.component.ts.tpl',
        'reset-password.component.ts.tpl',
      ],
    }
    const svelteAuthPages = [
      'login/+page.svelte.tpl',
      'signup/+page.svelte.tpl',
      'forgot-password/+page.svelte.tpl',
      'reset-password/+page.svelte.tpl',
    ]

    for (const [fw, pages] of Object.entries(authPages)) {
      const dir = fw === 'angular' ? 'pages' : 'pages'
      for (const page of pages) {
        const content = await readTemplate(fw, dir, page)
        expect(content).toContain('src="/logo.svg"')
        expect(content).not.toContain('AUTH_LOGO_ICON')
        expect(content).toContain('LOGO_SIZE')
      }
    }

    for (const page of svelteAuthPages) {
      const content = await readTemplate('svelte', 'routes', ...page.split('/'))
      // SvelteKit assembles the src through lib/logo.ts (LOGO_SRC) — a plain
      // '/logo.svg' literal trips the root-relative-assets build guard (it
      // checks every build output directory, and SvelteKit writes two).
      expect(content).toContain('src={LOGO_SRC}')
      expect(content).not.toContain('AUTH_LOGO_ICON')
      expect(content).toContain('LOGO_SIZE')
    }
    const svelteLogo = await readTemplate('svelte', 'lib', 'logo.ts.tpl')
    expect(svelteLogo).toContain("'logo.svg'")
  })

  it('PlanUpdated renders inside the app shell (its branded header comes from the layout)', async () => {
    // The PlanUpdated pages no longer carry their own header — the react
    // template's never did. They are protected routes, so the shell wrapping
    // them renders the branded header (its img logo is asserted above for
    // every framework). Each framework's router must keep plan-updated INSIDE
    // the guarded app layout — only then does the page get that header.
    const svelteAccess = await readTemplate('svelte', 'components', 'RouteAccess.svelte.tpl')
    // The public policy names exactly the shell-less routes; anything not
    // listed (plan-updated included) renders inside the guarded app shell.
    expect(svelteAccess).toContain("{ path: '/login' }")
    expect(svelteAccess).toContain("{ path: '/signup' }")
    expect(svelteAccess).toContain("{ path: '/about' }")
    expect(svelteAccess).toContain("{ path: '/forgot-password' }")
    expect(svelteAccess).toContain("{ path: '/reset-password' }")
    expect(svelteAccess).not.toContain('plan-updated')

    const vueMain = await readTemplate('vue', 'main.ts.tpl')
    expect(vueMain).toMatch(/component: AppLayout,\s*children: \[[^]*'plan-updated'/s)

    const angularMain = await readTemplate('angular', 'main.ts.tpl')
    expect(angularMain).toMatch(/component: AppLayoutComponent,\s*children: \[[^]*'plan-updated'/s)
  })

  it('all frameworks import branding in Footer and link About at the in-app page', async () => {
    // The footer's "About" link is the in-app /about route every app now ships,
    // NOT branding's WEBSITE_URL — that is the public marketing site, surfaced ON
    // the About page. Asserting its absence keeps the external link from creeping
    // back in (react keeps the name in an explanatory comment, so it is exempt).
    const reactFooter = await readTemplate('react', 'components', 'Footer.tsx.tpl')
    expect(reactFooter).toContain('APP_NAME')
    expect(reactFooter).toContain('aboutHref="/about"')
    // react delegates the Footer's i18n + privacy/terms rendering to the
    // shared @molecule/app-footer-react AppFooter; it still injects branding.
    expect(reactFooter).toContain('@molecule/app-footer-react')

    // vue delegates the Footer's i18n + privacy/terms rendering to the shared
    // @molecule/app-footer-vue AppFooter and keeps the About link on the in-app
    // route, as react does. Like react, the file explains WEBSITE_URL in a
    // comment — the absence assertion names the About-link wiring itself.
    const vueFooter = await readTemplate('vue', 'components', 'Footer.vue.tpl')
    expect(vueFooter).toContain('APP_NAME')
    expect(vueFooter).toContain('about-href="/about"')
    expect(vueFooter).toContain('@molecule/app-footer-vue')
    expect(vueFooter).not.toContain('about-href="WEBSITE_URL"')

    // The solid footer delegates to the shared @molecule/app-footer-solid;
    // the About link stays the in-app /about route and the interpolations run
    // inside the package. Like react, the file explains WEBSITE_URL in a
    // comment — the assertion below only forbids wiring the external URL into
    // the About link itself.
    const solidFooter = await readTemplate('solid', 'components', 'Footer.tsx.tpl')
    expect(solidFooter).not.toContain('aboutHref={WEBSITE_URL}')
    expect(solidFooter).toContain('APP_NAME')
    expect(solidFooter).toContain('aboutHref="/about"')
    expect(solidFooter).toContain('@molecule/app-footer-solid')

    // The angular footer delegates to the shared @molecule/app-footer-angular;
    // the About link stays the in-app /about route and the i18n + privacy/terms
    // rendering runs inside the package. Like react, the file explains
    // WEBSITE_URL in a comment — the assertion below only forbids wiring the
    // external URL into the About link itself.
    const angularFooter = await readTemplate('angular', 'components', 'footer.component.ts.tpl')
    expect(angularFooter).not.toContain('aboutHref="WEBSITE_URL"')
    expect(angularFooter).toContain('APP_NAME')
    expect(angularFooter).toContain('aboutHref="/about"')
    expect(angularFooter).toContain('@molecule/app-footer-angular')
    expect(angularFooter).toContain('loadContent')

    // The svelte footer delegates to the shared @molecule/app-footer-svelte;
    // the About link stays the in-app /about route and the interpolations run
    // inside the package. Like react, the file explains WEBSITE_URL in a
    // comment — the assertion below only forbids wiring the external URL into
    // the About link itself.
    const svelteFooter = await readTemplate('svelte', 'components', 'Footer.svelte.tpl')
    expect(svelteFooter).not.toContain('aboutHref={WEBSITE_URL}')
    expect(svelteFooter).toContain('APP_NAME')
    expect(svelteFooter).toContain('aboutHref="/about"')
    expect(svelteFooter).toContain('@molecule/app-footer-svelte')
  })

  it('no template variables remain in framework templates', async () => {
    const frameworks = ['react', 'vue', 'svelte', 'solid', 'angular']
    for (const fw of frameworks) {
      const files = await listTemplateFiles(fw)
      for (const file of files) {
        const content = await readTemplate(fw, ...file.split('/'))
        // No {{CAPS_VAR}} template variables should remain in framework templates
        const matches = content.match(/\{\{([A-Z_]+)\}\}/g) || []
        expect(matches).toEqual([])
      }
    }
  })

  it('all locale directories have the same set of template files', async () => {
    const localeDir = join(TEMPLATES, 'shared', 'locales')
    const locales = (await readdir(localeDir, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    expect(locales.length).toBeGreaterThanOrEqual(74)

    // English is the reference — all other locales must have the same files
    const referenceFiles = (await readdir(join(localeDir, 'en'))).sort()
    expect(referenceFiles).toEqual(['privacyPolicy.ts.tpl', 'termsOfService.ts.tpl', 'ui.ts.tpl'])

    for (const locale of locales) {
      const files = (await readdir(join(localeDir, locale))).sort()
      expect(files).toEqual(referenceFiles)
    }
  })

  it('locale ui.ts.tpl footer.about uses i18n interpolation, not scaffold-time var', async () => {
    const localeDir = join(TEMPLATES, 'shared', 'locales')
    const locales = await readdir(localeDir)
    for (const locale of locales) {
      const uiPath = join(localeDir, locale, 'ui.ts.tpl')
      const exists = await readFile(uiPath, 'utf-8').catch(() => null)
      if (!exists) continue
      // Must use {{appName}} (i18n interpolation at runtime), not {{PROJECT_NAME}} (scaffold-time)
      expect(exists).toContain('footer.about')
      expect(exists).toContain('{{appName}}')
      expect(exists).not.toContain('{{PROJECT_NAME}}')
    }
  })

  it('locale privacyPolicy.ts.tpl uses i18n interpolation, not scaffold-time var', async () => {
    const localeDir = join(TEMPLATES, 'shared', 'locales')
    const locales = await readdir(localeDir)
    for (const locale of locales) {
      const ppPath = join(localeDir, locale, 'privacyPolicy.ts.tpl')
      const content = await readFile(ppPath, 'utf-8').catch(() => null)
      if (!content) continue
      if (content.includes('{{appName}}')) {
        // Locales with privacy policy text must use {{appName}}, never {{PROJECT_NAME}}
        expect(content).not.toContain('{{PROJECT_NAME}}')
      }
    }
  })

  it('no locale template file uses {{PROJECT_NAME}}', async () => {
    const localeDir = join(TEMPLATES, 'shared', 'locales')
    const locales = await readdir(localeDir)
    for (const locale of locales) {
      const dir = join(localeDir, locale)
      const files = await readdir(dir).catch(() => [])
      for (const file of files) {
        const content = await readFile(join(dir, file), 'utf-8')
        expect(content).not.toContain('{{PROJECT_NAME}}')
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Create pipeline simulation
// ---------------------------------------------------------------------------

describe('Create pipeline simulation', () => {
  const tempDir = join(ROOT, '.test-create-output')

  // processTemplate reimplementation (same as create.ts)
  function processTemplate(content: string, vars: Record<string, string>): string {
    let result = content
    for (const [key, value] of Object.entries(vars)) {
      result = result.replaceAll(`{{${key}}}`, value)
    }
    return result
  }

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('processTemplate replaces {{PROJECT_NAME}} correctly', () => {
    const input = "persistKey: '{{PROJECT_NAME}}-theme'"
    const result = processTemplate(input, { PROJECT_NAME: 'my-cool-app' })
    expect(result).toBe("persistKey: 'my-cool-app-theme'")
  })

  it('processTemplate does not affect other {{ }} patterns', () => {
    // Vue/Angular use {{ expr }} for template interpolation
    const input = '{{ user?.name || "Guest" }} and {{PROJECT_NAME}}'
    const result = processTemplate(input, { PROJECT_NAME: 'app' })
    expect(result).toBe('{{ user?.name || "Guest" }} and app')
  })

  it('simulates React project creation', async () => {
    const projectDir = join(tempDir, 'react-app')
    await mkdir(join(projectDir, 'src', 'components'), { recursive: true })
    await mkdir(join(projectDir, 'src', 'pages'), { recursive: true })

    // Copy shared config
    const configContent = await readFile(join(TEMPLATES, 'shared', 'config.ts.tpl'), 'utf-8')
    await writeFile(
      join(projectDir, 'src', 'config.ts'),
      processTemplate(configContent, { PROJECT_NAME: 'react-app' }),
    )

    // Copy framework templates
    const files = await listTemplateFiles('react')
    for (const file of files) {
      const parts = file.split('/')
      const content = await readTemplate('react', ...parts)
      const outputName = parts[parts.length - 1].replace(/\.tpl$/, '')
      const outputDir = join(projectDir, 'src', ...parts.slice(0, -1))
      await mkdir(outputDir, { recursive: true })
      await writeFile(
        join(outputDir, outputName),
        processTemplate(content, { PROJECT_NAME: 'react-app' }),
      )
    }

    // Copy shared branding
    const brandingContent = await readFile(join(TEMPLATES, 'shared', 'branding.ts.tpl'), 'utf-8')
    await writeFile(
      join(projectDir, 'src', 'branding.ts'),
      processTemplate(brandingContent, { PROJECT_NAME: 'react-app' }),
    )

    // Verify output — config.ts has pure config values (providers moved to bond setups)
    const config = await readFile(join(projectDir, 'src', 'config.ts'), 'utf-8')
    expect(config).toContain('authConfig')
    expect(providerCreationCalls(config)).toEqual([])
    expect(config).not.toContain('{{PROJECT_NAME}}')

    // Branding has the substituted project name
    const branding = await readFile(join(projectDir, 'src', 'branding.ts'), 'utf-8')
    expect(branding).toContain("'react-app'")
    expect(branding).not.toContain('{{PROJECT_NAME}}')

    // Header imports from branding instead of having inline project name
    const header = await readFile(join(projectDir, 'src', 'components', 'Header.tsx'), 'utf-8')
    expect(header).toContain("from '../branding.js'")
    expect(header).not.toContain('{{PROJECT_NAME}}')
  })

  it('simulates SvelteKit project creation with correct paths', async () => {
    const projectDir = join(tempDir, 'svelte-app')
    await mkdir(join(projectDir, 'src', 'lib'), { recursive: true })
    await mkdir(join(projectDir, 'src', 'routes', 'login'), { recursive: true })
    await mkdir(join(projectDir, 'src', 'routes', 'signup'), { recursive: true })
    await mkdir(join(projectDir, 'src', 'routes', 'forgot-password'), { recursive: true })
    await mkdir(join(projectDir, 'src', 'routes', 'reset-password'), { recursive: true })
    await mkdir(join(projectDir, 'src', 'routes', 'plan-updated'), { recursive: true })
    await mkdir(join(projectDir, 'src', 'components'), { recursive: true })

    // Config and branding go to src/lib/ for SvelteKit
    const configContent = await readFile(join(TEMPLATES, 'shared', 'config.ts.tpl'), 'utf-8')
    await writeFile(
      join(projectDir, 'src', 'lib', 'config.ts'),
      processTemplate(configContent, { PROJECT_NAME: 'svelte-app' }),
    )
    const brandingContent = await readFile(join(TEMPLATES, 'shared', 'branding.ts.tpl'), 'utf-8')
    await writeFile(
      join(projectDir, 'src', 'lib', 'branding.ts'),
      processTemplate(brandingContent, { PROJECT_NAME: 'svelte-app' }),
    )

    // Copy framework templates
    const files = await listTemplateFiles('svelte')
    for (const file of files) {
      const parts = file.split('/')
      const content = await readTemplate('svelte', ...parts)
      const outputName = parts[parts.length - 1].replace(/\.tpl$/, '')
      const outputDir = join(projectDir, 'src', ...parts.slice(0, -1))
      await mkdir(outputDir, { recursive: true })
      await writeFile(
        join(outputDir, outputName),
        processTemplate(content, { PROJECT_NAME: 'svelte-app' }),
      )
    }

    // Verify SvelteKit structure — config.ts has pure config, providers in bonds
    const config = await readFile(join(projectDir, 'src', 'lib', 'config.ts'), 'utf-8')
    expect(config).toContain('authConfig')
    expect(providerCreationCalls(config)).toEqual([])
    expect(config).not.toContain('{{PROJECT_NAME}}')

    const hooks = await readFile(join(projectDir, 'src', 'hooks.client.ts'), 'utf-8')
    expect(hooks).toContain("from '#lib/bonds/index.js'")
    // authClient now comes from bonds, not #lib/config
    expect(hooks).not.toContain("from '#lib/config.js'")

    // Branding has the substituted project name
    const branding = await readFile(join(projectDir, 'src', 'lib', 'branding.ts'), 'utf-8')
    expect(branding).toContain("'svelte-app'")
    expect(branding).not.toContain('{{PROJECT_NAME}}')

    const layout = await readFile(join(projectDir, 'src', 'routes', '+layout.svelte'), 'utf-8')
    expect(layout).toContain("from '#lib/bonds/index.js'")
    expect(layout).not.toContain("from '#lib/config.js'")
    expect(layout).not.toContain('{{PROJECT_NAME}}')

    const layoutTs = await readFile(join(projectDir, 'src', 'routes', '+layout.ts'), 'utf-8')
    expect(layoutTs).toContain('export const ssr = false')

    const loginPage = await readFile(
      join(projectDir, 'src', 'routes', 'login', '+page.svelte'),
      'utf-8',
    )
    expect(loginPage).toContain('useLogin')
  })

  it('processTemplate preserves camelCase i18n interpolation vars', () => {
    // Locale files use {{appName}} for runtime i18n, {{PROJECT_NAME}} for scaffold-time
    // processTemplate only replaces UPPER_SNAKE_CASE keys, so {{appName}} passes through
    const input = 'About {{appName}} — {{PROJECT_NAME}}'
    const result = processTemplate(input, { PROJECT_NAME: 'my-app' })
    expect(result).toBe('About {{appName}} — my-app')
  })

  it('generate-icons.mjs.tpl gets correct BRANDING_PATH per framework', async () => {
    const content = await readFile(join(TEMPLATES, 'shared', 'generate-icons.mjs.tpl'), 'utf-8')

    // React/Vue/Solid/Angular: src/branding.ts
    const reactResult = processTemplate(content, { BRANDING_PATH: 'src/branding.ts' })
    expect(reactResult).toContain("join(root, 'src/branding.ts')")
    expect(reactResult).not.toContain('{{BRANDING_PATH}}')

    // Svelte: src/lib/branding.ts
    const svelteResult = processTemplate(content, { BRANDING_PATH: 'src/lib/branding.ts' })
    expect(svelteResult).toContain("join(root, 'src/lib/branding.ts')")
    expect(svelteResult).not.toContain('{{BRANDING_PATH}}')
  })

  it('simulates all 5 framework template copies without errors', async () => {
    const frameworks = ['react', 'vue', 'svelte', 'solid', 'angular']
    const vars = { PROJECT_NAME: 'test-project' }

    for (const fw of frameworks) {
      const projectDir = join(tempDir, `${fw}-copy-test`)
      const files = await listTemplateFiles(fw)

      for (const file of files) {
        const parts = file.split('/')
        const content = await readTemplate(fw, ...parts)
        const outputName = parts[parts.length - 1].replace(/\.tpl$/, '')
        const outputDir = join(projectDir, 'src', ...parts.slice(0, -1))
        await mkdir(outputDir, { recursive: true })

        // Should not throw
        const processed = processTemplate(content, vars)
        await writeFile(join(outputDir, outputName), processed)

        // No unsubstituted template variables remain
        expect(processed).not.toContain('{{PROJECT_NAME}}')
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Framework provider and auth patterns
// ---------------------------------------------------------------------------

describe('Auth patterns across frameworks', () => {
  it('all frameworks use useLogin/createLogin for login flow', async () => {
    const loginImports: Record<string, string> = {
      react: 'useLogin',
      vue: 'useLogin',
      svelte: 'useLogin',
      solid: 'useLogin',
      angular: 'useLogin',
    }

    for (const [fw, importName] of Object.entries(loginImports)) {
      let content: string
      if (fw === 'svelte') {
        content = await readTemplate('svelte', 'routes', 'login', '+page.svelte.tpl')
      } else if (fw === 'angular') {
        content = await readTemplate('angular', 'pages', 'login.component.ts.tpl')
      } else {
        content = await readTemplate(fw, 'pages', `Login.${fw === 'vue' ? 'vue' : 'tsx'}.tpl`)
      }
      expect(content).toContain(importName)
    }
  })

  it('all frameworks import from their molecule framework package', async () => {
    const frameworkPkgs: Record<string, string> = {
      react: '@molecule/app-react',
      vue: '@molecule/app-vue',
      svelte: '@molecule/app-svelte',
      solid: '@molecule/app-solid',
      angular: '@molecule/app-angular',
    }

    for (const [fw, pkg] of Object.entries(frameworkPkgs)) {
      let content: string
      if (fw === 'svelte') {
        content = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
      } else if (fw === 'angular') {
        content = await readTemplate('angular', 'pages', 'login.component.ts.tpl')
      } else {
        content = await readTemplate(fw, 'pages', `Login.${fw === 'vue' ? 'vue' : 'tsx'}.tpl`)
      }
      expect(content).toContain(`from '${pkg}'`)
    }
  })

  it('all frameworks have theme toggle', async () => {
    // The shared header renders the default toggle.
    const reactHeader = await readTemplate('react', 'components', 'Header.tsx.tpl')
    expect(reactHeader).toContain("from '@molecule/app-header-react'")

    const svelteLogin = await readTemplate('svelte', 'routes', 'login', '+page.svelte.tpl')
    expect(svelteLogin).toContain('<ThemeToggle />')
    expect(svelteLogin).toContain("from '@molecule/app-ui-svelte'")
    const svelteHeader = await readTemplate('svelte', 'components', 'Header.svelte.tpl')
    expect(svelteHeader).toContain('@molecule/app-header-svelte')
  })
})
