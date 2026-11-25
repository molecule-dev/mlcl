/**
 * `node dist/machine-install-cli.js activate <home>` makes this copy the current version of the
 * machine install at `<home>` (`mlcl setup` runs it after installing a version), printing
 * `{"version", "ms"}`. `update <home>` checks for a newer version and switches to it (the
 * server's background check). See machine-install.ts.
 */
import { activate, update } from './machine-install.js'

const [command, home] = process.argv.slice(2)

async function main(): Promise<void> {
  if (!home || (command !== 'activate' && command !== 'update'))
    throw new Error('usage: machine-install-cli.js activate|update <home>')
  if (command === 'activate') process.stdout.write(`${JSON.stringify(await activate(home))}\n`)
  else process.stdout.write(`${await update(home)}\n`)
}

main().catch((error) => {
  process.stderr.write(
    `molecule-mcp ${command}: ${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exit(1)
})
