import { copyFile, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { ESLint, type Rule, RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * The scaffold rule that names `useOptimisticValue` for a hand-rolled server-backed toggle that
 * changes the button at once. The invalid cases include the shapes of X1 runs whose "should
 * unfavorite an article" test failed (l1285, l1296, l1297, 2026-11-04) and non-X1 toggles (a
 * grocery checkbox, a setting switch, a star button). A toggle that changes only when the server
 * answers (l1259's follow button, a refetching star) cannot flip back and stays silent.
 */
const require = createRequire(import.meta.url)
const template = fileURLToPath(
  new URL('../../../templates/shared/eslint.config.js.tpl', import.meta.url),
)
const tmp = tmpdir()
await mkdir(tmp, { recursive: true })
const dir = await mkdtemp(join(tmp, 'mlcl-optimistic-toggle-rule-'))
const configPath = join(dir, 'eslint.config.mjs')
await copyFile(template, configPath)
await mkdir(join(dir, 'eslint-rules'))
await copyFile(
  join(import.meta.dirname, '../../../templates/shared/prefer-declared-clients.mjs'),
  join(dir, 'eslint-rules/prefer-declared-clients.mjs'),
)
await symlink(
  dirname(dirname(require.resolve('eslint/package.json'))),
  join(dir, 'node_modules'),
  'dir',
)
afterAll(() => rm(dir, { recursive: true, force: true }))

const config = (await import(pathToFileURL(configPath).href)).default as ReadonlyArray<{
  plugins?: Record<string, { rules: Record<string, Rule.RuleModule> }>
}>
const plugin = config.find((entry) => entry.plugins?.['molecule-local'])?.plugins?.[
  'molecule-local'
]
const rule = plugin?.rules['server-toggles-use-optimistic-value']
const ruleId = 'molecule-local/server-toggles-use-optimistic-value'

/** X1 l1296 (2026-11-04): each click sends its own request and sets state from its response. */
const favoriteButton = `import { useState } from 'react'
import { useHttpClient } from '@molecule/app-react'

export function FavoriteButton({ article }: { article: Article }) {
  const http = useHttpClient()
  const [favorited, setFavorited] = useState(article.favorited)
  const toggle = async () => {
    const next = !favorited
    setFavorited(next)
    const response = next
      ? await http.post(\`/articles/\${article.slug}/favorite\`)
      : await http.delete(\`/articles/\${article.slug}/favorite\`)
    setFavorited(response.data.article.favorited)
  }
  return <button onClick={toggle}>{favorited ? 'Unfavorite' : 'Favorite'}</button>
}
`

describe('molecule-local/server-toggles-use-optimistic-value', () => {
  it('loads from the real template as a warning that names the hook', async () => {
    expect(rule).toBeDefined()
    const eslint = new ESLint({
      cwd: dir,
      overrideConfigFile: configPath,
      overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: dir } } },
    })
    const [result] = await eslint.lintText(favoriteButton, { filePath: 'FavoriteButton.tsx' })
    const findings = result.messages.filter((message) => message.ruleId === ruleId)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: 1, line: 10 })
    expect(findings[0]?.message).toContain('`useOptimisticValue` from `@molecule/app-react`')
  })

  if (rule) {
    const tester = new RuleTester({
      languageOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    })

    tester.run('server-toggles-use-optimistic-value', rule, {
      valid: [
        {
          name: 'an asynchronous local animation persists no preference',
          filename: 'Panel.tsx',
          code: `import { useState } from 'react'
export function Panel() {
  const [open, setOpen] = useState(false)
  const toggle = async () => {
    const next = !open
    setOpen(next)
    await animatePanel(next)
  }
  return <button onClick={toggle} />
}`,
        },
        {
          name: 'a form submit wrapper calls a draft save',
          filename: 'Settings.tsx',
          code: `import { useState } from 'react'
export function Settings() {
  const [saved, setSaved] = useState(false)
  const submit = async () => {
    const next = !saved
    setSaved(next)
    await http.put('/settings', { acknowledged: next })
  }
  return <form onSubmit={(event) => { event.preventDefault(); void submit() }} />
}`,
        },
        {
          name: 'a controller commit is protected even when it updates local state',
          filename: 'Switch.tsx',
          code: `import { useState } from 'react'
import { createOptimisticValue as optimistic } from '@molecule/app-state'
export function Switch() {
  const [on, setOn] = useState(false)
  const commit = async () => {
    setOn(!on)
    await saveSettings(!on)
  }
  const value = optimistic({ value: on, commit })
  return <button onClick={() => value.update((on) => !on)} />
}`,
        },
        {
          name: 'a parameter shadowing a setter is not that setter',
          filename: 'Local.tsx',
          code: `import { useState } from 'react'
export function Local() {
  const [on, setOn] = useState(false)
  async function report(setOn) {
    setOn(!on)
    await saveSettings(!on)
  }
  return <button onClick={() => report(log)} />
}`,
        },
        {
          name: 'a local panel toggle awaits analytics but saves no preference',
          filename: 'Panel.tsx',
          code: `import { useState } from 'react'
import { track } from '@molecule/app-analytics'
export function Panel() {
  const [open, setOpen] = useState(false)
  const toggle = async () => {
    const next = !open
    setOpen(next)
    await track({ name: 'panel', properties: { open: next } })
  }
  return <button onClick={toggle} />
}`,
        },
        {
          name: 'a local panel loads data without persisting its open flag',
          filename: 'Panel.tsx',
          code: `import { useState } from 'react'
export function Panel() {
  const [open, setOpen] = useState(false)
  const toggle = async () => {
    const next = !open
    setOpen(next)
    await http.get('/preview', { expanded: next })
  }
  return <button onClick={toggle} />
}`,
        },
        {
          name: 'a confirmation dialog returns a decision, not a saved switch',
          filename: 'Delete.tsx',
          code: `import { useState } from 'react'
export function Delete() {
  const [open, setOpen] = useState(false)
  const ask = async () => {
    const next = !open
    setOpen(next)
    await confirmDialog(next)
  }
  return <button onClick={ask} />
}`,
        },
        {
          name: 'a form submit changes local feedback before saving the draft',
          filename: 'Settings.tsx',
          code: `import { useState } from 'react'
export function Settings() {
  const [saved, setSaved] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    const next = !saved
    setSaved(next)
    await http.put('/settings', { acknowledged: next })
  }
  return <form onSubmit={submit} />
}`,
        },
        {
          name: 'a setter in an uncalled nested function changes nothing before the request',
          filename: 'Settings.tsx',
          code: `import { useState } from 'react'
export function Settings() {
  const [on, setOn] = useState(false)
  const toggle = async () => {
    const next = !on
    const later = () => setOn(next)
    await http.put('/settings', { enabled: next })
    later()
  }
  return <button onClick={toggle} />
}`,
        },
        {
          name: 'a local object choosing a method is not a request',
          filename: 'Options.tsx',
          code: `import { useState } from 'react'
export function Options() {
  const [on, setOn] = useState(false)
  const choose = () => {
    setOn(!on)
    const options = { method: on ? 'DELETE' : 'POST' }
    return options
  }
  return <button onClick={choose} />
}`,
        },
        {
          name: 'a cyclic promise alias does not crash lint',
          filename: 'Unusual.tsx',
          code: `import { useState } from 'react'
export function Unusual() {
  const [on, setOn] = useState(false)
  const toggle = () => {
    setOn(!on)
    const request = saveSettings(!on)
    const a = b
    const b = a
  }
  return <button onClick={toggle} />
}`,
        },
        {
          name: 'the same toggle through useOptimisticValue',
          filename: 'FavoriteButton.tsx',
          code: `import { useOptimisticValue } from '@molecule/app-react'
export function FavoriteButton({ article }) {
  const favorite = useOptimisticValue({
    value: article.favorited,
    commit: async (next) => {
      const response = next ? await http.post(path) : await http.delete(path)
      return response.data.article.favorited
    },
  })
  return <button onClick={() => favorite.update((on) => !on)}>{favorite.value ? 'Unfavorite' : 'Favorite'}</button>
}
`,
        },
        {
          name: 'separate create and delete actions are not a toggle',
          filename: 'Comments.tsx',
          code: `import { useState } from 'react'
export function Comments({ slug }) {
  const [items, setItems] = useState([])
  const add = async (body) => setItems([...items, await http.post('/comments', { body })])
  const remove = async (id) => {
    await http.delete('/comments/' + id)
    setItems(items.filter((item) => item.id !== id))
  }
  return <CommentList items={items} onAdd={add} onRemove={remove} />
}
`,
        },
        {
          name: 'a controlled checkbox that only reports the flip',
          filename: 'Checkbox.tsx',
          code: `export function Checkbox({ checked, onChange }) {
  return <input type="checkbox" checked={checked} onChange={() => onChange(!checked)} />
}
`,
        },
        {
          name: 'a local panel toggle beside an unrelated awaited call',
          filename: 'Panel.tsx',
          code: `import { useState } from 'react'
export function Panel() {
  const [open, setOpen] = useState(false)
  const toggle = async () => {
    const next = !open
    setOpen(next)
    await track('panel-toggled')
  }
  return <button onClick={toggle}>{open ? 'Close' : 'Open'}</button>
}
`,
        },
        {
          name: 'an editor choosing create or update is not a toggle',
          filename: 'Editor.tsx',
          code: `import { useState } from 'react'
export function Editor({ article }) {
  const [draft] = useState(article ?? {})
  const isNew = !article
  const save = async () => {
    const saved = isNew ? await createArticle(draft) : await updateArticle(article.slug, draft)
    navigate('/article/' + saved.slug)
  }
  return <form onSubmit={save} />
}
`,
        },
        {
          name: 'an empty-field guard before a save',
          filename: 'NewComment.tsx',
          code: `import { useState } from 'react'
export function NewComment() {
  const [body, setBody] = useState('')
  const submit = async () => {
    if (!body) return
    await http.post('/comments', { body })
    setBody('')
  }
  return <form onSubmit={submit} />
}
`,
        },
        {
          name: 'an API client module chooses the request for a caller-supplied flag',
          filename: 'api.ts',
          code: `export function setFollowing(username: string, following: boolean) {
  const path = '/profiles/' + username + '/follow'
  return following ? client.post(path) : client.delete(path)
}
`,
        },
        {
          name: 'X1 l1259 shape: a follow button that changes only when the server answers',
          filename: 'Profile.tsx',
          code: `import { useState } from 'react'
export function Profile({ initial }) {
  const [profile, setProfile] = useState(initial)
  async function toggleFollow() {
    setProfile(await setFollowing(profile.username, !profile.following))
  }
  return <button onClick={() => void toggleFollow()}>{profile.following ? 'Unfollow' : 'Follow'}</button>
}
`,
        },
        {
          name: 'a star saved first and shown after the refetch',
          filename: 'BoardDetail.tsx',
          code: `import { useState } from 'react'
export function BoardDetail({ initial }) {
  const [board, setBoard] = useState(initial)
  const handleStar = async () => {
    await http.patch('/api/boards/' + board.id, { is_starred: !board.is_starred })
    setBoard(await load(board.id))
  }
  return <button onClick={handleStar}>{board.is_starred ? 'Unstar' : 'Star'}</button>
}
`,
        },
        {
          name: 'an HTTP method chosen between DELETE and POST, shown after the answer',
          filename: 'ArticlePreview.tsx',
          code: `export function ArticlePreview({ article, onChange }) {
  async function toggleFavorite() {
    const response = await http.request({
      method: article.favorited ? 'DELETE' : 'POST',
      url: '/articles/' + article.slug + '/favorite',
    })
    onChange(response.data.article)
  }
  return <button onClick={() => void toggleFavorite()}>{article.favoritesCount}</button>
}
`,
        },
        {
          name: 'a negated option that is not the field it sets',
          filename: 'Login.tsx',
          code: `import { useState } from 'react'
export function Login() {
  const [skipRemember] = useState(false)
  const submit = async () => {
    await http.post('/login', { remember: !skipRemember ? 'yes' : 'no' })
  }
  return <form onSubmit={submit} />
}
`,
        },
      ],
      invalid: [
        {
          name: 'a request options object chooses DELETE versus PUT',
          filename: 'Switch.tsx',
          code: `import { useState } from 'react'
export function Switch() {
  const [on, setOn] = useState(false)
  const toggle = async () => {
    setOn(!on)
    const options = { method: on ? 'DELETE' : 'PUT', url: '/flag' }
    await http.request(options)
  }
  return <button onClick={toggle} />
}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          name: 'an unused optimistic helper import does not exempt a racing handler',
          filename: 'FavoriteButton.tsx',
          code: `import { useOptimisticValue } from '@molecule/app-react'\n${favoriteButton}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          name: 'a protected sibling does not exempt another server toggle',
          filename: 'Settings.tsx',
          code: `import { useState } from 'react'
import { createOptimisticValue } from '@molecule/app-state'
export function Settings() {
  const safe = createOptimisticValue({ value: false, commit: saveSafe })
  const [on, setOn] = useState(false)
  const toggle = async () => {
    setOn(!on)
    await saveSettings(!on)
  }
  return <button onClick={toggle} />
}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          name: 'DELETE versus POST chosen from the current value',
          filename: 'FavoriteButton.tsx',
          code: `import { useState } from 'react'
export function FavoriteButton() {
  const [on, setOn] = useState(false)
  const toggle = async () => {
    setOn(!on)
    await (on ? http.delete('/favorite') : http.post('/favorite'))
  }
  return <button onClick={toggle} />
}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          name: 'a TypeScript satisfies expression retains its toggled value',
          filename: 'Switch.tsx',
          code: `import { useState } from 'react'
export function Switch() {
  const [on, setOn] = useState(false)
  const toggle = async () => {
    const next = (!on) satisfies boolean
    setOn(next)
    await http.put('/settings', { on: next })
  }
  return <button onClick={toggle} />
}`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          name: 'X1 l1296: a request chosen by the toggled value, each response applied',
          filename: 'FavoriteButton.tsx',
          code: favoriteButton,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          name: 'X1 l1297: a toggled value held in a variable and passed to the save',
          filename: 'FavoriteButton.tsx',
          code: `import { useState } from 'react'
export function FavoriteButton({ slug, article }) {
  const [state, setState] = useState(article)
  const toggle = async () => {
    const before = state
    const next = !before.favorited
    setState({ ...before, favorited: next })
    const { article: saved } = await favorite(slug, next)
    setState(saved)
  }
  return <button onClick={toggle}>{state.favorited ? 'Unfavorite' : 'Favorite'}</button>
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          name: 'X1 l1285: an unawaited request whose promise is caught',
          filename: 'Conduit.tsx',
          code: `import { useState } from 'react'
export function FavoriteButton({ slug, favorited }) {
  const [state, setState] = useState({ favorited })
  const toggle = (): void => {
    const next = !state.favorited
    setState((current) => ({ favorited: !current.favorited }))
    const request = next ? client.post(path) : client.delete(path)
    request.catch(() => {})
  }
  return <button onClick={toggle}>{state.favorited ? 'Unfavorite' : 'Favorite'}</button>
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          name: 'the HTTP method chosen between DELETE and POST after the button changed',
          filename: 'ArticlePreview.tsx',
          code: `import { useState } from 'react'
export function ArticlePreview({ article }) {
  const [favorited, setFavorited] = useState(article.favorited)
  async function toggleFavorite() {
    setFavorited(!favorited)
    const response = await http.request({
      method: favorited ? 'DELETE' : 'POST',
      url: '/articles/' + article.slug + '/favorite',
    })
    setFavorited(response.data.article.favorited)
  }
  return <button onClick={() => void toggleFavorite()}>{favorited ? 'Unfavorite' : 'Favorite'}</button>
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          name: 'non-X1: a grocery checkbox flipped in the list, then saved from the row',
          filename: 'GroceryList.tsx',
          code: `import { useState } from 'react'
export function GroceryList({ initial }) {
  const [items, setItems] = useState(initial)
  const toggleItem = async (item) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
    await http.put('/api/grocery-list/' + item.id, { checked: !item.checked })
  }
  return items.map((item) => <input key={item.id} type="checkbox" checked={item.checked} onChange={() => void toggleItem(item)} />)
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          name: 'non-X1: a setting switch whose save is chained with then',
          filename: 'NotificationsSwitch.tsx',
          code: `import { useState } from 'react'
export function NotificationsSwitch({ settings }) {
  const [on, setOn] = useState(settings.notifications)
  const flip = () => {
    const next = !on
    setOn(next)
    saveSettings({ notifications: next }).then((saved) => setOn(saved.notifications))
  }
  return <button role="switch" aria-checked={on} onClick={flip} />
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
        {
          name: 'non-X1: a star button through fetch, reported once per handler',
          filename: 'StarButton.tsx',
          code: `import { useState } from 'react'
export function StarButton({ repo }) {
  const [starred, setStarred] = useState(repo.starred)
  const star = async () => {
    const next = !starred
    setStarred(next)
    await fetch('/repos/' + repo.id + '/star', { method: next ? 'PUT' : 'DELETE' })
    await (next ? notify('starred') : notify('unstarred'))
  }
  return <button onClick={star}>{repo.stars}</button>
}
`,
          errors: [{ messageId: 'useOptimisticValue' }],
        },
      ],
    })
  }
})
