---
name: app-patterns
description: Frontend architecture patterns for molecule app packages. Three-layer architecture, UIClassMap system, framework swapping, storage decoupling, and interface reference.
---

# App (Frontend) Patterns

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: Framework-Agnostic Interfaces                         │
│  Pure TypeScript types/interfaces - NO framework imports        │
│  @molecule/app-ui, @molecule/app-state, etc.                   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: Framework Bindings                                    │
│  Framework-specific implementations of Layer 1 interfaces       │
│  @molecule/app-react, @molecule/app-vue, @molecule/app-svelte, │
│  @molecule/app-solid, @molecule/app-angular,                    │
│  @molecule/app-react-native                                     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: Library Providers                                     │
│  Specific library implementations                               │
│  @molecule/app-state-zustand (React), @molecule/app-state-pinia │
│  (Vue), @molecule/app-http-axios (agnostic)                    │
└─────────────────────────────────────────────────────────────────┘
```

**Layer 1** — Pure TypeScript types, NO framework imports. `ButtonProps`, `Store<T>` are identical across frameworks.

**Layer 2** — Each framework implements all interfaces using its idioms. React uses hooks, Vue uses composables, Angular uses services.

**Layer 3** — Libraries are either framework-agnostic (Axios) or framework-specific (Zustand = React only). Don't force agnostic when the library doesn't support it.

## Key Principles

1. **Interfaces are sacred** — identical across frameworks
2. **Framework bindings implement interfaces** — React/Vue/Angular idioms
3. **Libraries couple where necessary** — Zustand is React-only, that's fine
4. **Swap at framework level** — Change `app-react` → `app-vue` or `app-react-native`
5. **No artificial abstraction** — Don't force agnostic when library doesn't support it
6. **UIClassMap = N+M** — `getClassMap()` at runtime

## UIClassMap Pattern (N+M)

Collapses N frameworks × M styling libraries into N+M:

```typescript
// @molecule/app-ui defines the interface
export interface UIClassMap {
  cn(...inputs: ClassMapValue[]): string
  button(opts?: ButtonClassOptions): string
  input(opts?: InputClassOptions): string
  formError: string
  cardHeader: string
  // ...
}

// Wire at startup
import { classMap } from '@molecule/app-ui-tailwind'
setClassMap(classMap)

// Framework UI packages use getClassMap(), ZERO styling dependency
const cm = getClassMap()
const classes = cm.cn(cm.button({ variant, color, size }), className)
```

Adding a styling lib = 1 ClassMap implementation → all framework packages work.
Adding a framework = 1 UI package → works with all ClassMap implementations.

## Parallel Framework Work

When working across multiple frameworks (React, Vue, Svelte, Solid, Angular, React Native) — e.g., creating UI components, framework bindings, or framework-specific bonds — use parallel subagents, one per framework. Each framework package is independent.

## Framework Swapping

```typescript
// React → Vue: swap imports, same API
import { Button, useStore } from '@molecule/app-react'
import { Button, useStore } from '@molecule/app-vue'
```

## Swappable Features

Every app core interface (`type: "core"`) is a swappable feature. Its available implementations are bonds where `implements` matches in the centralized registry (`mlcl/registry.json`). Use `loadRegistry('app')` or `getRawRegistry()` to look up packages programmatically.

Framework bindings (`app/frameworks/`) and styling bonds (`app/bonds/ui/`) are also swappable.

## Storage Decoupling Rules

NEVER hardcode `localStorage`, `sessionStorage`, or `AsyncStorage` directly. Storage must always be injectable/configurable.

**Why:** Different platforms have different storage APIs. Users may want secure/encrypted storage. Testing requires injectable storage. Cross-platform compatibility demands abstraction.

### Correct Patterns

**Pattern 1: Required Storage Parameter**

```typescript
export function createPersistedStore<T>(
  key: string,
  initial: T,
  storage: StorageAdapter, // Required - user must provide
): Store<T>
```

**Pattern 2: Optional with Memory Default**

```typescript
export function createStore<T>(config: {
  initial: T
  persist?: {
    key: string
    storage: StorageAdapter // User must explicitly provide
  }
}): Store<T>
```

**Pattern 3: StorageAdapter Interface**

```typescript
interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
// Compatible with localStorage, sessionStorage, and custom implementations
```

### BAD Patterns (NEVER DO THESE)

```typescript
// BAD - Hardcoded localStorage
const stored = localStorage.getItem(key)

// BAD - Defaulting to localStorage
function createStore(config: { storage = localStorage }) { }

// BAD - Feature detection fallback
if (typeof localStorage !== 'undefined') { storage = localStorage }
```

**Default to `'memory'` storage, not localStorage.**

**Example: `@molecule/app-theme-css-variables`** accepts an optional `ThemeStorageAdapter` in its config for persisting the active theme. When no storage is provided, theme persistence is skipped (in-memory only). Users can pass a storage bond like `@molecule/app-storage-localstorage` for browser environments.

To check whether a specific package uses storage, read its README.md or `src/types.ts` for `StorageAdapter` or `storage` parameters.

## i18n Pattern

All user-visible text must go through the i18n system. Never hardcode English strings in components or templates.

### Framework-Specific Usage

| Framework    | Import                | Hook/Function                            | Usage in Template |
| ------------ | --------------------- | ---------------------------------------- | ----------------- |
| React        | `@molecule/app-react` | `const { t } = useTranslation()`         | `{t('key')}`      |
| Vue          | `@molecule/app-vue`   | `const { t } = useTranslation()`         | `{{ t('key') }}`  |
| Svelte       | `@molecule/app-i18n`  | `import { t } from '@molecule/app-i18n'` | `{t('key')}`      |
| Solid        | `@molecule/app-i18n`  | `import { t } from '@molecule/app-i18n'` | `{t('key')}`      |
| Angular      | `@molecule/app-i18n`  | `import { t } from '@molecule/app-i18n'` | `{{ t('key') }}`  |
| React Native | `@molecule/app-i18n`  | `import { t } from '@molecule/app-i18n'` | `{t('key')}`      |

### Key Naming Convention

Use dot-notation: `scope.component.element`

```
auth.login.email        # Auth login page, email field
settings.billing        # Settings page, billing section
common.loading          # Shared across pages
ide.chat.send           # IDE feature, chat panel, send button
```

### Feature Packages

Feature packages use `t(key, values, { defaultValue })` from `@molecule/app-i18n` with English inline fallbacks. Translations live in **companion locale bond packages** (`@molecule/{stack}-locales-{name}`), NOT embedded in the feature package:

```typescript
// In the feature package — use t() with defaultValue fallback
import { t } from '@molecule/app-i18n'
const msg = t('forms.required', undefined, { defaultValue: 'This field is required' })

// Translations come from the companion locale bond:
// @molecule/app-locales-forms provides en, es, fr, ja, ... (79 languages)
import { en, es } from '@molecule/app-locales-forms'
provider.addTranslations('en', en)
provider.addTranslations('es', es)
```

**Never embed a `translations.ts` file in a feature package.** All translations belong in the locale bond.

### UI Primitives

UI primitives (`@molecule/app-ui-react`, etc.) accept optional string props with English defaults — no i18n dependency:

```typescript
// Good — consumer passes translated string
<Modal closeLabel={t('ui.modal.close')} />

// Also good — English default works without i18n
<Modal />  // defaults to aria-label="Close"
```

### Template Setup

Templates wire i18n in `config.ts` using `createSimpleI18nProvider` with English translations from `locales/en.ts`. The provider is both set globally (`setI18nProvider`) and passed to `MoleculeProvider`. For packages with locale bonds, register their translations alongside the app's own translations.

## Package Naming (Frontend)

| Pattern                              | Example                          |
| ------------------------------------ | -------------------------------- |
| `@molecule/app-{category}`           | `app-state` (core interface)     |
| `@molecule/app-{framework}`          | `app-react` (framework bindings) |
| `@molecule/app-ui-{framework}`       | `app-ui-react` (UI components)   |
| `@molecule/app-{category}-{library}` | `app-state-zustand` (provider)   |

## Interface Reference

Interface definitions live in the actual package source code. To look up any core interface, read its `src/types.ts` in the molecule repo:

```
~/molecule-workspace/molecule/packages/app/core/{name}/src/types.ts
```

Each package's README.md also documents its interfaces, provider pattern, and available methods. When working on a frontend package, read the relevant source — don't rely on cached summaries.

### Native Capability Pattern

Native capability packages (`packages/app/native/`) provide platform-abstracted access to device hardware and OS features. Each follows the standard core interface pattern:

```typescript
// src/types.ts — Platform-agnostic interface
export interface HapticsProvider {
  impact(style?: ImpactStyle): Promise<void>
  notification(type?: NotificationType): Promise<void>
  vibrate(pattern?: number[]): Promise<void>
}

// src/provider.ts — Standard get/set/has
export const setProvider = (p: HapticsProvider) => { ... }
export const getProvider = (): HapticsProvider => { ... }
export const hasProvider = (): boolean => { ... }
```

Key rules:

- Every native package has `isSupported()` or `getCapabilities()` for feature detection
- Providers are platform-specific (Capacitor, React Native, Web API). React Native bond providers live in `packages/app/bonds/native/{category}/react-native/`
- Always check `isSupported()` before calling methods
- Reference: `packages/app/native/{name}/src/types.ts` for each interface

Scan `~/molecule-workspace/molecule/packages/app/native/` for all available native capability packages.

### Feature Package Pattern

Feature packages (`packages/app/features/`) provide domain-specific functionality with swappable implementations:

```typescript
// @molecule/app-maps — core interface
export interface MapProvider {
  createMap(config: MapConfig): MapInstance | Promise<MapInstance>
  getName(): string
  isLoaded(): boolean
  getStyles(): { id: string; name: string; url: string }[]
  // ... geocode, reverseGeocode, directions
}
```

Features are typically more complex than native capabilities and may have framework-specific bindings.

Scan `~/molecule-workspace/molecule/packages/app/features/` for available feature packages. Read each package's `src/types.ts` for the interface definition.
