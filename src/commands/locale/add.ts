import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { Args, Command, Flags } from '@oclif/core'

import {
  appLocaleDirectory,
  parseAppLocales,
  projectAppLocales,
  writeAppLocaleLoaders,
} from '../../lib/app-locales.js'
import { appI18nBondFile, usePackageLocales } from '../../lib/extend-app-wiring.js'
import { sortImportStatements } from '../../lib/format.js'
import { refreshAppTranslationCatalogs } from '../../lib/injector.js'
import { npmInstallRoot } from '../../lib/npm-install-root.js'
import { withProjectLock } from '../../lib/project-lock.js'
import { copyTemplateDir, getTemplatesDir } from '../../lib/scaffold.js'

export default class LocaleAdd extends Command {
  static override description = 'Add a locale to a custom app and regenerate its locale loaders.'

  static override args = {
    code: Args.string({ description: 'Locale code, such as fr or zh-TW', required: true }),
  }

  static override flags = {
    project: Flags.directory({ char: 'p', description: 'Project directory', default: '.' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(LocaleAdd)
    const root = resolve(flags.project)
    const app = projectAppLocales(root) ? root : join(root, 'app')
    const templates = getTemplatesDir()
    const codes = parseAppLocales(args.code, templates)
    if (codes.length !== 1) this.error('Supply one locale code.')
    const [code] = codes

    await withProjectLock(npmInstallRoot(app), async () => {
      const existing = projectAppLocales(app)
      if (!existing) this.error('This command requires a custom scaffold with managed locales.')
      const locales = [...new Set([...existing, code])]
      const dir = appLocaleDirectory(app)
      const target = join(dir, code)
      const primary = join(dir, existing[0])
      const manifestPath = join(app, 'package.json')
      const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as {
        name: string
        molecule: { locales: string[] }
      }
      const skip = ['ui.ts', 'privacyPolicy.ts', 'termsOfService.ts']
        .filter((name) => existsSync(join(target, name)) || !existsSync(join(primary, name)))
        .map((name) => `${name}.tpl`)
      await mkdir(target, { recursive: true })
      await copyTemplateDir(
        join(templates, 'app', 'shared', 'locales', code),
        target,
        {
          PROJECT_NAME: manifest.name,
        },
        { skip },
      )
      await refreshAppTranslationCatalogs(app, locales)
      await writeAppLocaleLoaders(dir, locales)
      // A bond mlcl 2.2.15 wrote loads every language of each locale bond; the generated
      // locales/packages.ts the refresh just wrote holds only the ones the app offers.
      const bond = join(dir, '..', 'bonds', appI18nBondFile())
      if (existsSync(bond)) {
        const current = await readFile(bond, 'utf-8')
        const next = usePackageLocales(current)
        if (next !== current) await writeFile(bond, sortImportStatements(next, bond))
      }
      manifest.molecule.locales = locales
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    })
    this.log(`App locale ${code} is available. Run npm run typecheck to check its translations.`)
  }
}
