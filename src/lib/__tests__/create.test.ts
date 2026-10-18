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

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES = join(ROOT, 'templates', 'app')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readTemplate(framework: string, ...path: string[]): Promise<string> {
  return readFile(join(TEMPLATES, framework, ...path), 'utf-8')
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

// ---------------------------------------------------------------------------
// Template inventory tests
// ---------------------------------------------------------------------------

describe('Template file inventory', () => {
  it('shared config template has pure config values (no provider creation)', async () => {
    const content = await readFile(join(TEMPLATES, 'shared', 'config.ts.tpl'), 'utf-8')
    expect(content).toContain('authConfig')
    // Auth, theme, and i18n providers are all in bond setup files, not config
    expect(content).not.toContain('createJWTAuthClient')
    expect(content).not.toContain('createCSSVariablesThemeProvider')
    expect(content).not.toContain('createSimpleI18nProvider')
  })

  it('emits currentUserEndpoint beside the other auth endpoints (xr-molecule-flash-m159)', async () => {
    // m159: an app rewrote its authConfig with loginEndpoint/registerEndpoint and
    // omitted the current-user route, so the client's `/users/me` default answered
    // 404 on reload. Emitting the route in the scaffolded config — named as the
    // route `validateSession()` calls — keeps it in view when the file is rewritten.
    const content = await readFile(join(TEMPLATES, 'shared', 'config.ts.tpl'), 'utf-8')
    expect(content).toContain("currentUserEndpoint: '/users/me'")
    const at = content.indexOf('currentUserEndpoint:')
    // Inside the authConfig object, beside login/register (not somewhere else).
    expect(at).toBeGreaterThan(content.indexOf('loginEndpoint:'))
    expect(at).toBeLessThan(content.indexOf('autoRefresh'))
    expect(content.slice(0, at)).toContain('validateSession()')
  })

  it('React has 19 template files', async () => {
    const files = await listTemplateFiles('react')
    expect(files).toEqual([
      'App.tsx.tpl',
      'components/AppLayout.tsx.tpl',
      'components/AuthGuard.tsx.tpl',
      'components/FloatingInput.tsx.tpl',
      'components/Footer.tsx.tpl',
      'components/Header.tsx.tpl',
      'components/Icon.tsx.tpl',
      'components/OAuthButtons.tsx.tpl',
      'components/SettingsPanel.tsx.tpl',
      'components/ThemeToggle.tsx.tpl',
      'components/UserMenu.tsx.tpl',
      'main.tsx.tpl',
      'pages/About.tsx.tpl',
      'pages/ForgotPassword.tsx.tpl',
      'pages/Home.tsx.tpl',
      'pages/Login.tsx.tpl',
      'pages/PlanUpdated.tsx.tpl',
      'pages/ResetPassword.tsx.tpl',
      'pages/Signup.tsx.tpl',
    ])
  })

  it('Vue has 19 template files', async () => {
    const files = await listTemplateFiles('vue')
    expect(files).toEqual([
      'App.vue.tpl',
      'components/AppLayout.vue.tpl',
      'components/AuthGuard.vue.tpl',
      'components/FloatingInput.vue.tpl',
      'components/Footer.vue.tpl',
      'components/Header.vue.tpl',
      'components/Icon.vue.tpl',
      'components/OAuthButtons.vue.tpl',
      'components/SettingsPanel.vue.tpl',
      'components/ThemeToggle.vue.tpl',
      'components/UserMenu.vue.tpl',
      'main.ts.tpl',
      'pages/About.vue.tpl',
      'pages/ForgotPassword.vue.tpl',
      'pages/Home.vue.tpl',
      'pages/Login.vue.tpl',
      'pages/PlanUpdated.vue.tpl',
      'pages/ResetPassword.vue.tpl',
      'pages/Signup.vue.tpl',
    ])
  })

  it('Svelte has 14 SvelteKit template files', async () => {
    const files = await listTemplateFiles('svelte')
    expect(files).toEqual([
      'components/FloatingInput.svelte.tpl',
      'components/Footer.svelte.tpl',
      'components/Icon.svelte.tpl',
      'components/SettingsPanel.svelte.tpl',
      'hooks.client.ts.tpl',
      'routes/+layout.svelte.tpl',
      'routes/+layout.ts.tpl',
      'routes/+page.svelte.tpl',
      'routes/about/+page.svelte.tpl',
      'routes/forgot-password/+page.svelte.tpl',
      'routes/login/+page.svelte.tpl',
      'routes/plan-updated/+page.svelte.tpl',
      'routes/reset-password/+page.svelte.tpl',
      'routes/signup/+page.svelte.tpl',
    ])
  })

  it('Solid has 19 template files', async () => {
    const files = await listTemplateFiles('solid')
    expect(files).toEqual([
      'App.tsx.tpl',
      'components/AppLayout.tsx.tpl',
      'components/AuthGuard.tsx.tpl',
      'components/FloatingInput.tsx.tpl',
      'components/Footer.tsx.tpl',
      'components/Header.tsx.tpl',
      'components/Icon.tsx.tpl',
      'components/OAuthButtons.tsx.tpl',
      'components/SettingsPanel.tsx.tpl',
      'components/ThemeToggle.tsx.tpl',
      'components/UserMenu.tsx.tpl',
      'main.tsx.tpl',
      'pages/About.tsx.tpl',
      'pages/ForgotPassword.tsx.tpl',
      'pages/Home.tsx.tpl',
      'pages/Login.tsx.tpl',
      'pages/PlanUpdated.tsx.tpl',
      'pages/ResetPassword.tsx.tpl',
      'pages/Signup.tsx.tpl',
    ])
  })

  it('Angular has 19 template files', async () => {
    const files = await listTemplateFiles('angular')
    expect(files).toEqual([
      'app.component.ts.tpl',
      'components/app-layout.component.ts.tpl',
      'components/auth.guard.ts.tpl',
      'components/floating-input.component.ts.tpl',
      'components/footer.component.ts.tpl',
      'components/header.component.ts.tpl',
      'components/icon.component.ts.tpl',
      'components/oauth-buttons.component.ts.tpl',
      'components/settings-panel.component.ts.tpl',
      'components/theme-toggle.component.ts.tpl',
      'components/user-menu.component.ts.tpl',
      'main.ts.tpl',
      'pages/about.component.ts.tpl',
      'pages/forgot-password.component.ts.tpl',
      'pages/home.component.ts.tpl',
      'pages/login.component.ts.tpl',
      'pages/plan-updated.component.ts.tpl',
      'pages/reset-password.component.ts.tpl',
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

    it('Header uses molecule UI components', async () => {
      const content = await readTemplate('vue', 'components', 'Header.vue.tpl')
      expect(content).toContain("from '@molecule/app-ui-vue'")
      expect(content).toContain('Flex')
    })
  })

  describe('Svelte', () => {
    it('Login uses class generators from @molecule/app-ui-svelte', async () => {
      const content = await readTemplate('svelte', 'routes', 'login', '+page.svelte.tpl')
      expect(content).toContain("from '@molecule/app-ui-svelte'")
      expect(content).toContain('getButtonClasses')
      expect(content).toContain('FloatingInput')
    })

    it('Home uses @molecule/app-svelte', async () => {
      const content = await readTemplate('svelte', 'routes', '+page.svelte.tpl')
      expect(content).toContain("from '@molecule/app-svelte'")
      expect(content).toContain('createAuthStores')
    })

    it('Layout uses class generators from molecule UI', async () => {
      const content = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
      expect(content).toContain("from '@molecule/app-ui-svelte'")
      expect(content).toContain('getButtonClasses')
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
      expect(content).toContain('createAuth')
    })

    it('Header uses molecule UI components', async () => {
      const content = await readTemplate('solid', 'components', 'Header.tsx.tpl')
      expect(content).toContain("from '@molecule/app-ui-solid'")
      expect(content).toContain('Flex')
    })
  })

  describe('Angular', () => {
    it('Login uses @molecule/app-ui-angular', async () => {
      const content = await readTemplate('angular', 'pages', 'login.component.ts.tpl')
      expect(content).toContain("from '@molecule/app-ui-angular'")
      expect(content).toContain('MoleculeButton')
      expect(content).toContain('FloatingInputComponent')
      expect(content).toContain('mol-button')
      expect(content).toContain('app-floating-input')
    })

    it('Header uses getClassMap for layout', async () => {
      const content = await readTemplate('angular', 'components', 'header.component.ts.tpl')
      expect(content).toContain("from '@molecule/app-ui'")
      expect(content).toContain('getClassMap')
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
    expect(content).toContain("from '$lib/bonds/index.js'")
    // authClient now comes from bonds, not config
    expect(content).not.toContain("from '$lib/config.js'")
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
    expect(content).toContain("from '$lib/bonds/index.js'")
    expect(content).not.toContain("from '$lib/config.js'")
    expect(content).toContain('authClient')
    expect(content).toContain('themeProvider')
  })

  it('+layout.svelte uses Svelte 5 runes', async () => {
    const content = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
    expect(content).toContain('$props()')
    expect(content).toContain('$effect(')
    expect(content).toContain('{@render children()}')
  })

  it('+layout.svelte has auth guard and app layout', async () => {
    const content = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
    expect(content).toContain('$isAuthenticated')
    expect(content).toContain("goto('/login')")
    expect(content).toContain('APP_NAME')
    expect(content).toContain("from '$lib/branding.js'")
    expect(content).toContain('logout')
    expect(content).toContain('toggleTheme')
    // The loading gate is `status === 'loading'`, not `initialized` — a stored
    // token AND user make the first render 'authenticated' (xr-molecule-flash-m177).
    expect(content).toContain("$authState.status === 'loading'")
    expect(content).not.toContain('$authState.initialized')
  })

  it('+page.svelte shows user greeting (Home)', async () => {
    const content = await readTemplate('svelte', 'routes', '+page.svelte.tpl')
    expect(content).toContain('createAuthStores')
    expect(content).toContain('$user')
    expect(content).toContain("t('home.greeting')")
  })

  it('login/+page.svelte has login form', async () => {
    const content = await readTemplate('svelte', 'routes', 'login', '+page.svelte.tpl')
    expect(content).toContain('createLoginStore')
    expect(content).toContain('$state(')
    expect(content).toContain('loginStore.call')
    expect(content).toContain("goto('/')")
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
    expect(app).toContain('BrowserRouter')
    expect(app).toContain('<Routes>')

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

    const guard = await readTemplate('vue', 'components', 'AuthGuard.vue.tpl')
    expect(guard).toContain('useRouter')
    expect(guard).toContain('RouterView')
    // The guard waits on `status === 'loading'`, not `initialized`: a stored
    // token AND user make the first render 'authenticated' (xr-molecule-flash-m177).
    expect(guard).toContain("state.status === 'loading'")
    expect(guard).not.toContain('state.initialized')
  })

  it('Svelte uses SvelteKit file-based routing', async () => {
    const files = await listTemplateFiles('svelte')
    expect(files).toContain('routes/+layout.svelte.tpl')
    expect(files).toContain('routes/+page.svelte.tpl')
    expect(files).toContain('routes/login/+page.svelte.tpl')
    // No client-side router library
    const layout = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
    expect(layout).toContain("from '$app/navigation'")
    expect(layout).toContain("from '$app/stores'")
  })

  it('Solid uses @solidjs/router for routing', async () => {
    const app = await readTemplate('solid', 'App.tsx.tpl')
    expect(app).toContain("from '@solidjs/router'")
    expect(app).toContain('Router')
    expect(app).toContain('Route')

    const guard = await readTemplate('solid', 'components', 'AuthGuard.tsx.tpl')
    expect(guard).toContain('Navigate')
    expect(guard).toContain('ParentProps')
    // Same rule as the other framework guards: `status === 'loading'` decides the
    // fallback, so a restored session paints on the first render.
    expect(guard).toContain("state().status !== 'loading'")
    expect(guard).not.toContain('state().initialized')
  })

  it('Angular uses @angular/router for routing', async () => {
    const main = await readTemplate('angular', 'main.ts.tpl')
    expect(main).toContain("from '@angular/router'")
    expect(main).toContain('provideRouter')
    expect(main).toContain('Routes')

    const guard = await readTemplate('angular', 'components', 'auth.guard.ts.tpl')
    expect(guard).toContain('CanActivateFn')
    expect(guard).toContain('MoleculeAuthService')
    // It waits only while `status === 'loading'`, so a restored session is not
    // bounced to /login before the client finishes restoring (xr-molecule-flash-m177).
    expect(guard).toContain("state.status !== 'loading'")
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
    expect(content).not.toContain('createJWTAuthClient')
    expect(content).not.toContain('createCSSVariablesThemeProvider')
    expect(content).not.toContain('createSimpleI18nProvider')
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

  it('React Login imports branding constants and uses img logo', async () => {
    const content = await readTemplate('react', 'pages', 'Login.tsx.tpl')
    expect(content).toContain("from '../branding.js'")
    expect(content).toContain('APP_NAME')
    expect(content).toContain('LOGO_SIZE')
    expect(content).toContain('src="/logo.svg"')
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

    const svelteLayout = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
    expect(svelteLayout).toContain("from '$lib/branding.js'")
  })

  it('all frameworks use img logo in Header', async () => {
    // react delegates Header chrome (incl. the logo <img>) to the shared
    // @molecule/app-header-react AppHeader component.
    const reactHeader = await readTemplate('react', 'components', 'Header.tsx.tpl')
    expect(reactHeader).toContain('@molecule/app-header-react')
    expect(reactHeader).not.toContain('LOGO_ICON')

    const vueHeader = await readTemplate('vue', 'components', 'Header.vue.tpl')
    expect(vueHeader).toContain('src="/logo.svg"')
    expect(vueHeader).not.toContain('LOGO_ICON')

    const solidHeader = await readTemplate('solid', 'components', 'Header.tsx.tpl')
    expect(solidHeader).toContain('src="/logo.svg"')
    expect(solidHeader).not.toContain('LOGO_ICON')

    const angularHeader = await readTemplate('angular', 'components', 'header.component.ts.tpl')
    expect(angularHeader).toContain('src="/logo.svg"')
    expect(angularHeader).not.toContain('LOGO_ICON')

    const svelteLayout = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
    expect(svelteLayout).toContain('src="/logo.svg"')
    expect(svelteLayout).not.toContain('LOGO_ICON')
  })

  it('all frameworks use img logo in auth pages', async () => {
    const authPages: Record<string, string[]> = {
      react: ['Login.tsx.tpl', 'Signup.tsx.tpl', 'ForgotPassword.tsx.tpl', 'ResetPassword.tsx.tpl'],
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
      expect(content).toContain('src="/logo.svg"')
      expect(content).not.toContain('AUTH_LOGO_ICON')
      expect(content).toContain('LOGO_SIZE')
    }
  })

  it('PlanUpdated templates use img logo where header is present', async () => {
    // Svelte, Vue, Angular PlanUpdated pages have a header with logo
    const sveltePU = await readTemplate('svelte', 'routes', 'plan-updated', '+page.svelte.tpl')
    expect(sveltePU).toContain('src="/logo.svg"')

    const vuePU = await readTemplate('vue', 'pages', 'PlanUpdated.vue.tpl')
    expect(vuePU).toContain('src="/logo.svg"')

    const angularPU = await readTemplate('angular', 'pages', 'plan-updated.component.ts.tpl')
    expect(angularPU).toContain('src="/logo.svg"')
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

    const vueFooter = await readTemplate('vue', 'components', 'Footer.vue.tpl')
    expect(vueFooter).not.toContain('WEBSITE_URL')
    expect(vueFooter).toContain('APP_NAME')
    expect(vueFooter).toContain('to="/about"')
    expect(vueFooter).toContain("t('footer.about', { appName: APP_NAME })")
    expect(vueFooter).toContain("t('content.privacyPolicy', { appName: APP_NAME })")

    const solidFooter = await readTemplate('solid', 'components', 'Footer.tsx.tpl')
    expect(solidFooter).not.toContain('WEBSITE_URL')
    expect(solidFooter).toContain('APP_NAME')
    expect(solidFooter).toContain('href="/about"')
    expect(solidFooter).toContain("t('footer.about', { appName: APP_NAME })")
    expect(solidFooter).toContain("t('content.privacyPolicy', { appName: APP_NAME })")

    const angularFooter = await readTemplate('angular', 'components', 'footer.component.ts.tpl')
    expect(angularFooter).not.toContain('WEBSITE_URL')
    expect(angularFooter).toContain('APP_NAME')
    expect(angularFooter).toContain('routerLink="/about"')
    // Angular uses getter methods for interpolated t() calls
    expect(angularFooter).toContain("t('footer.about', { appName: APP_NAME })")
    expect(angularFooter).toContain("t('content.privacyPolicy', { appName: APP_NAME })")

    const svelteFooter = await readTemplate('svelte', 'components', 'Footer.svelte.tpl')
    expect(svelteFooter).not.toContain('WEBSITE_URL')
    expect(svelteFooter).toContain('APP_NAME')
    expect(svelteFooter).toContain('href="/about"')
    expect(svelteFooter).toContain("$t('footer.about', { appName: APP_NAME })")
    expect(svelteFooter).toContain("$t('content.privacyPolicy', { appName: APP_NAME })")
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
    expect(config).not.toContain('createJWTAuthClient')
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
    expect(config).not.toContain('createJWTAuthClient')
    expect(config).not.toContain('{{PROJECT_NAME}}')

    const hooks = await readFile(join(projectDir, 'src', 'hooks.client.ts'), 'utf-8')
    expect(hooks).toContain("from '$lib/bonds/index.js'")
    // authClient now comes from bonds, not $lib/config
    expect(hooks).not.toContain("from '$lib/config.js'")

    // Branding has the substituted project name
    const branding = await readFile(join(projectDir, 'src', 'lib', 'branding.ts'), 'utf-8')
    expect(branding).toContain("'svelte-app'")
    expect(branding).not.toContain('{{PROJECT_NAME}}')

    const layout = await readFile(join(projectDir, 'src', 'routes', '+layout.svelte'), 'utf-8')
    expect(layout).toContain("from '$lib/bonds/index.js'")
    expect(layout).not.toContain("from '$lib/config.js'")
    expect(layout).not.toContain('{{PROJECT_NAME}}')

    const layoutTs = await readFile(join(projectDir, 'src', 'routes', '+layout.ts'), 'utf-8')
    expect(layoutTs).toContain('export const ssr = false')

    const loginPage = await readFile(
      join(projectDir, 'src', 'routes', 'login', '+page.svelte'),
      'utf-8',
    )
    expect(loginPage).toContain('createLoginStore')
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
      svelte: 'createLoginStore',
      solid: 'createLogin',
      angular: 'createLoginState',
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
    // react now shims the shared ThemeToggle from @molecule/app-ui-react
    // (the toggleTheme logic lives in the shared component); svelte still
    // ships an inline toggle in its layout.
    const reactToggle = await readTemplate('react', 'components', 'ThemeToggle.tsx.tpl')
    expect(reactToggle).toContain('ThemeToggle')
    expect(reactToggle).toMatch(/@molecule\/app-ui-react|toggleTheme/)

    const svelteLayout = await readTemplate('svelte', 'routes', '+layout.svelte.tpl')
    expect(svelteLayout).toContain('toggleTheme')
  })
})
