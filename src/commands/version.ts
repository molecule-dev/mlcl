import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { Command } from 'commander'

const __dirname = fileURLToPath(path.dirname(import.meta.url))

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, `../../package.json`), `utf8`)) as {
  name: string
  description: string
  version: string
}

/**
 * Adds the `version` command to the program.
 */
export const version = (program: Command) => {
  program
    .name(process.env.APP_NAME || pkg.name)
    .description(pkg.description)
    .version(process.env.APP_VERSION || pkg.version)
}
