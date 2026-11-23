/**
 * A React Native app gets the web's theme colours on a device, in dark mode, and in its navigator.
 *
 * Until 2026-11-23 a fresh react-native app's `tailwind.config.js` loaded only NativeWind's preset,
 * so none of the ClassMap's theme-colour classes (`bg-surface`, `text-foreground`, …) generated a
 * style; `app.json` let Expo force light mode; and React Navigation's headers stayed light in a
 * dark theme. The theme bond the scaffold picks on react-native (`@molecule/app-theme-nativewind`)
 * sets the colours; these tests pin the scaffold and injector halves of that wiring.
 */
import { existsSync, mkdirSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { disableAI } from '../ai.js'
import {
  generateBondSetupCode,
  type InjectionPlan,
  synthesizeAppProjectFiles,
} from '../injector.js'
import { loadRegistry } from '../registry.js'
import { createReactNativeAppProject } from '../scaffold.js'
import type { InferredPackage } from '../schema.js'

/** Metro's custom resolver hook, as metro.config.js sets it. */
type MetroResolve = (
  context: { originModulePath: string; resolveRequest: (...args: unknown[]) => unknown },
  moduleName: string,
  platform: string,
) => unknown

describe('react-native scaffold: theme wiring', () => {
  let projectPath: string

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'mlcl-rn-theme-'))
    await createReactNativeAppProject(projectPath, 'rn-app')
  })

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true })
  })

  it('loads the Molecule preset and finds the ClassMap dists wherever npm put them', async () => {
    const config = await readFile(join(projectPath, 'tailwind.config.js'), 'utf-8')
    expect(config).toContain("const molecule = require('@molecule/app-ui-nativewind/preset')")
    expect(config).toContain("presets: [require('nativewind/preset'), molecule]")
    expect(config).toContain('...molecule.moleculeContent(__dirname)')
    // Literal ./node_modules globs match nothing once npm hoists the packages.
    expect(config).not.toContain('./node_modules/@molecule/')
  })

  it("follows the device's appearance setting and the web's rem", async () => {
    const appJson = JSON.parse(await readFile(join(projectPath, 'app.json'), 'utf-8'))
    expect(appJson.expo.userInterfaceStyle).toBe('automatic')
    const metro = await readFile(join(projectPath, 'metro.config.js'), 'utf-8')
    expect(metro).toContain("withNativeWind(config, { input: './src/global.css', inlineRem: 16 })")
  })

  it("lets Metro bundle the source's './x.js' imports of its .ts modules", async () => {
    const source = await readFile(join(projectPath, 'metro.config.js'), 'utf-8')
    // Expo detects a workspace root itself; a hand-set one watched the folder above the app.
    expect(source).not.toContain('config.watchFolders')
    const stubs: Record<string, unknown> = {
      fs: { existsSync, mkdirSync },
      path: { dirname, join, resolve },
      'expo/metro-config': { getDefaultConfig: () => ({ resolver: {} }) },
      'nativewind/metro': { withNativeWind: (config: unknown) => config },
    }
    const module = { exports: {} as { resolver: { resolveRequest: MetroResolve } } }
    new Function('require', 'module', '__dirname', source)(
      (name: string) => stubs[name],
      module,
      projectPath,
    )
    const resolveRequest = module.exports.resolver.resolveRequest
    await writeFile(join(projectPath, 'src', 'legacy.js'), '')
    const asked: string[] = []
    const context = {
      originModulePath: join(projectPath, 'src', 'App.tsx'),
      resolveRequest: (_context: unknown, name: string) => asked.push(name),
    }
    for (const name of ['./bonds/index.js', './legacy.js', 'react-native', '../config.json'])
      resolveRequest(context, name, 'ios')
    expect(asked).toEqual(['./bonds/index', './legacy.js', 'react-native', '../config.json'])
  })

  it('gives React Navigation the molecule theme', async () => {
    const app = await readFile(join(projectPath, 'src', 'App.tsx'), 'utf-8')
    expect(app).toMatch(
      /import \{[^}]*\buseNavigationTheme\b[^}]*\} from '@molecule\/app-routing-react-navigation'/,
    )
    expect(app).toMatch(
      /import \{[^}]*\bDarkTheme\b[^}]*\bDefaultTheme\b[^}]*\} from '@react-navigation\/native'/,
    )
    expect(app).toContain('const navigationThemes = { light: DefaultTheme, dark: DarkTheme }')
    expect(app).toContain('const navigationTheme = useNavigationTheme(navigationThemes)')
    expect(app).toMatch(/<NavigationContainer[^>]*\btheme=\{navigationTheme\}/)
  })

  it('installs what the device appearance and `expo start --web` need', async () => {
    const pkg = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'))
    expect(pkg.scripts.web).toBe('expo start --web')
    for (const name of ['expo-system-ui', 'react-dom', 'react-native-web', '@expo/metro-runtime'])
      expect(pkg.dependencies[name], name).toMatch(/^\d+\.\d+\.\d+$/)
    expect(pkg.dependencies['react-dom']).toBe(pkg.dependencies.react)
  })
})

describe('theme bond file for a framework provider', () => {
  beforeEach(() => disableAI())

  /**
   * A theme provider package as the registry describes it.
   *
   * @param name - The package.
   * @param framework - Its registry framework, when it has one.
   * @returns The package.
   */
  const themeProvider = (name: string, framework?: string): InferredPackage => ({
    name,
    version: '1.0.0',
    type: 'provider',
    routes: [],
    tables: [],
    exports: ['createNativeWindThemeProvider', 'lightTheme', 'darkTheme'],
    path: '/tmp/none',
    dependencies: {},
    peerDependencies: {},
    molecule: {
      category: 'theme',
      implements: '@molecule/app-theme',
      ...(framework ? { framework } : {}),
      appBondSetup: { exportName: 'themeProvider', reExport: true, generatorType: 'theme' },
    },
  })

  it("takes the default provider's form: the bond's own config, no applyToDocument", async () => {
    const code = await generateBondSetupCode(
      themeProvider('@molecule/app-theme-nativewind', 'react-native'),
      'app-theme-nativewind',
      '@molecule/app-theme',
      '/tmp/none',
    )
    expect(code).toContain('export const themeProvider = createNativeWindThemeProvider({')
    expect(code).toContain('themes: [lightTheme, darkTheme],')
    expect(code).toContain("persistKey: 'molecule-theme',")
    expect(code).not.toContain('applyToDocument')
  })

  it('keeps a preset provider (no framework, not the default) as it was', async () => {
    const code = await generateBondSetupCode(
      themeProvider('@molecule/app-theme-some-preset'),
      'app-theme-some-preset',
      '@molecule/app-theme',
      '/tmp/none',
    )
    expect(code).toContain('applyToDocument: false,')
  })

  it("mocks the provider's factory with the theme methods in the bonds smoke test", async () => {
    const name = '@molecule/app-theme-nativewind'
    const projectPath = await mkdtemp(join(tmpdir(), 'mlcl-rn-theme-smoke-'))
    try {
      await writeFile(join(projectPath, 'package.json'), '{}')
      const plan: InjectionPlan = {
        molecule: name,
        moleculePackage: themeProvider(name, 'react-native'),
        files: [],
        dependencies: [],
        migrations: [],
        bondSetup: {
          providerPackage: name,
          interfacePackage: '@molecule/app-theme',
          interfaceType: 'theme',
          setupCode: 'mock',
        },
        conflicts: [],
      }
      const files = synthesizeAppProjectFiles(
        [plan],
        [name, '@molecule/app-theme'],
        projectPath,
        loadRegistry(),
      )
      const smoke = files.find((file) => file.targetPath.endsWith('bonds.test.ts'))?.content ?? ''
      const factory = smoke.slice(smoke.indexOf('createNativeWindThemeProvider: vi.fn('))
      // The factory's object closes at the mock entry's own indent.
      const members = factory.slice(0, factory.indexOf('\n  })),'))
      expect(members).not.toBe('')
      for (const member of ['getTheme: vi.fn(', 'setTheme: vi.fn(', 'subscribe: vi.fn('])
        expect(members).toContain(member)
    } finally {
      await rm(projectPath, { recursive: true, force: true })
    }
  })
})
