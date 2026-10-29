import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const NPMIGNORE = fileURLToPath(new URL('../../../templates/.npmignore', import.meta.url))

describe('npm template payload policy', () => {
  it('excludes authoring state while preserving runtime and custom-template inputs', () => {
    const root = mkdtempSync(join(tmpdir(), 'mlcl-package-payload-'))
    try {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({
          name: 'mlcl-package-payload-fixture',
          version: '1.0.0',
          files: ['/templates'],
        }),
      )
      mkdirSync(join(root, 'templates'), { recursive: true })
      copyFileSync(NPMIGNORE, join(root, 'templates', '.npmignore'))

      const excluded = [
        'templates/apps/example/.polish/session.json',
        'templates/apps/example/.polish-complete',
        'templates/apps/example/.stitch-complete',
        'templates/apps/example/screen-map.json',
        'templates/apps/3d-model-viewer/scripts/fix-classmap-types.mjs',
        'templates/apps/3d-model-viewer/scripts/fix-tailwind-classnames.mjs',
      ]
      const preserved = [
        // template.json is read by the installed CLI for packages and secrets.
        'templates/apps/example/template.json',
        'templates/apps/example/app/src/App.tsx',
        'templates/apps/example/app/src/__tests__/App.test.ts',
        'templates/apps/example/e2e/example.spec.ts',
        'templates/apps/example/app/public/fonts/example.woff2',
        'templates/.agents/skills/example/SKILL.md',
        // Non-flagship custom scaffolds consume these shared template inputs.
        'templates/app/shared/playwright.config.ts.tpl',
        'templates/shared/fonts/example.ttf',
      ]
      for (const path of [...excluded, ...preserved]) {
        const target = join(root, path)
        mkdirSync(dirname(target), { recursive: true })
        writeFileSync(target, `fixture: ${path}\n`)
      }

      const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
        cwd: root,
        encoding: 'utf8',
      })
      const parsed = JSON.parse(raw)
      const pack = Array.isArray(parsed) ? parsed[0] : parsed
      const paths = pack.files.map((file: { path: string }) => file.path) as string[]

      for (const path of excluded) expect(paths).not.toContain(path)
      for (const path of preserved) expect(paths).toContain(path)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
