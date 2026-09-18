// NOTE: theme preference is the ONE sanctioned use of raw `localStorage` — it must
// be read/written synchronously so the theme applies before first paint (an async
// StorageAdapter would cause a light→dark flash on load). For ALL app data, do NOT
// use localStorage directly: go through `@molecule/app-storage` (StorageAdapter) so
// it stays swappable and testable.
//
// This helper toggles the `.dark` class on <html> — the SAME switch the molecule
// theme provider (`@molecule/app-theme`) flips and what every ClassMap dark variant
// reads. If your app has the theme provider wired (it does by default, via
// MoleculeProvider), you can instead drive light/dark from React with
// `useTheme()` (`@molecule/app-react`): `const { mode, setTheme, toggleTheme } =
// useTheme()`. This standalone helper exists for the pre-React-boot no-flash path.
type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme-mode'

export function getThemeMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system'
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  return saved ?? 'system'
}

function resolveSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(mode: ThemeMode): void {
  const effective = mode === 'system' ? resolveSystemTheme() : mode
  // `.dark` on <html> is what the ClassMap dark variants (and the molecule theme
  // provider) key off — a `data-theme` attribute would recolor nothing.
  document.documentElement.classList.toggle('dark', effective === 'dark')
  if (mode === 'system') {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, mode)
  }
}

let initialized = false

export function initThemeListener(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  // Apply current preference on load.
  applyTheme(getThemeMode())
  // Re-apply if OS theme changes and we're in 'system' mode.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemeMode() === 'system') applyTheme('system')
  })
}
