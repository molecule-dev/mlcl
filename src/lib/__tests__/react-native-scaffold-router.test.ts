/**
 * A fresh react-native app bonds the molecule router to its React Navigation navigator.
 *
 * Until 2026-11-24 the scaffold's `src/App.tsx` rendered `<NavigationContainer>` with no ref and
 * never called `useMoleculeRouter`, so `navigate()` from any molecule package went to
 * `@molecule/app-routing`'s fallback router and nothing happened on the device. These tests run
 * the generated `App` against stand-ins for React, React Navigation and the molecule modules, and
 * check what it hands each one.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createReactNativeAppProject } from '../scaffold.js'

/** An element the stand-in `React.createElement` builds. */
interface Element {
  type: unknown
  props: Record<string, unknown>
  children: unknown[]
}

/** What the generated App handed the stand-ins while it rendered once. */
interface Rendered {
  tree: Element
  refs: unknown[]
  routerConfigs: Array<{ navigationRef?: unknown; linking?: { screens: Record<string, string> } }>
}

/** Runs the generated `src/App.tsx` once against stand-in modules. */
function renderApp(source: string): Rendered {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  })
  const refs: unknown[] = []
  const routerConfigs: Rendered['routerConfigs'] = []
  const createElement = (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ): Element => ({
    type,
    props: props ?? {},
    children,
  })
  const modules: Record<string, Record<string, unknown>> = {
    './global.css': {},
    react: { __esModule: true, default: { createElement } },
    '@react-navigation/native': {
      DarkTheme: { dark: true },
      DefaultTheme: { dark: false },
      NavigationContainer: 'NavigationContainer',
      createNavigationContainerRef: () => {
        const ref = { current: null }
        refs.push(ref)
        return ref
      },
    },
    '@react-navigation/native-stack': {
      createNativeStackNavigator: () => ({ Navigator: 'Navigator', Screen: 'Screen' }),
    },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider' },
    '@molecule/app-i18n': {
      t: (_key: string, _values: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue,
    },
    '@molecule/app-routing-react-navigation': {
      useNavigationTheme: () => 'navigation theme',
      useMoleculeRouter: (config: Rendered['routerConfigs'][number]) => {
        routerConfigs.push(config)
        return {}
      },
    },
    './bonds/index.js': { setupProviders: () => undefined },
    './screens/Home.js': { HomeScreen: 'HomeScreen' },
  }
  const exports: Record<string, unknown> = {}
  new Function('require', 'exports', outputText)((name: string) => {
    if (!(name in modules))
      throw new Error(`App.tsx imports ${name}, which this test does not stand in for`)
    return modules[name]
  }, exports)
  const App = exports.App as () => Element
  return { tree: App(), refs, routerConfigs }
}

/** Every element in a rendered tree, depth first. */
function elements(node: unknown): Element[] {
  if (!node || typeof node !== 'object' || !('type' in node)) return []
  const element = node as Element
  return [element, ...element.children.flatMap(elements)]
}

describe('react-native scaffold: molecule router', () => {
  let projectPath: string

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'mlcl-rn-router-'))
    await createReactNativeAppProject(projectPath, 'rn-app')
  })

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true })
  })

  it('bonds the molecule router to the ref its NavigationContainer gets', async () => {
    const { tree, refs, routerConfigs } = renderApp(
      await readFile(join(projectPath, 'src', 'App.tsx'), 'utf-8'),
    )
    expect(refs).toHaveLength(1)
    expect(routerConfigs).toHaveLength(1)
    const container = elements(tree).find((element) => element.type === 'NavigationContainer')
    expect(container?.props.ref).toBe(refs[0])
    expect(routerConfigs[0]?.navigationRef).toBe(refs[0])
    expect(container?.props.theme).toBe('navigation theme')
  })

  it('gives every screen of the navigator a path, Home at /', async () => {
    const { tree, routerConfigs } = renderApp(
      await readFile(join(projectPath, 'src', 'App.tsx'), 'utf-8'),
    )
    const screens = elements(tree)
      .filter((element) => element.type === 'Screen')
      .map((element) => String(element.props.name))
    expect(screens).toEqual(['Home'])
    const paths = routerConfigs[0]?.linking?.screens ?? {}
    expect(paths.Home).toBe('/')
    for (const screen of screens) expect(paths[screen], screen).toMatch(/^\//)
  })
})
