/** Keep the scaffold's route lint in step with the resource clients mlcl generates. */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

import { CLI_COMMAND } from '#cli-command'

/** One generated export and the route it actually implements. */
export interface ResourceClientRoute {
  path: string
  methods: string
  exportName: string
}

/** Files and callable routes written by a resource generator. */
interface ResourceClient {
  path: string
  view?: string
  routes: ResourceClientRoute[]
}

type GeneratorArgs = ['--contract' | '--package', string]

interface Registration {
  args: GeneratorArgs
  clients: ResourceClient[]
  uncovered: string[]
}

const START = '// BEGIN GENERATED RESOURCE CLIENTS'
const END = '// END GENERATED RESOURCE CLIENTS'
const DECLARATION = 'const generatedResourceClients = '
const BLOCK = new RegExp(
  `^${START}\\r?\\n// prettier-ignore\\r?\\n${DECLARATION}([\\s\\S]*?)\\r?\\n${END}$`,
  'm',
)
const RULE_FILE = 'prefer-generated-resource-clients.mjs'
const ROUTE_IMPORT =
  "import { generatedResourceClientConfig } from './eslint-rules/" + RULE_FILE + "'"
const CLIENT_IMPORT =
  "import preferDeclaredClients, { scaffoldRules } from './eslint-rules/prefer-declared-clients.mjs'"
const CONFIG_EXPORT = /^export default tseslint\.config\(\r?$/m

async function readIfPresent(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

/**
 * Record the generated clients in this workspace's ESLint config. Package registrations
 * accumulate. The active contract replaces the prior contract's registration, just like
 * its file manifest. Keep the original entries for modules the generator leaves edited.
 *
 * @param projectRoot - Absolute project root.
 * @param workspace - The app workspace, relative to the project root.
 * @param args - How this generator was selected by `mlcl resources`.
 * @param modules - Project-relative module outputs and their covered routes.
 * @param kept - Project-relative files kept because the generator did not own their contents.
 * @param paths - Declared paths. An uncovered static path can take precedence over a parameter.
 */
export async function writeResourceClientLint(
  projectRoot: string,
  workspace: string,
  args: GeneratorArgs,
  modules: ResourceClient[],
  kept: string[],
  paths: string[],
): Promise<void> {
  const root = join(projectRoot, workspace)
  let target = join(root, 'eslint.config.js')
  let config = await readIfPresent(target)
  if (config === null) {
    target = join(root, 'eslint.config.mjs')
    config = await readIfPresent(target)
  }
  if (config === null) return

  const isLegacyScaffold =
    !config.includes(START) && config.includes(CLIENT_IMPORT) && CONFIG_EXPORT.test(config)
  const block = BLOCK.exec(config)
  if (!block && !isLegacyScaffold) return
  const registrations = block ? (JSON.parse(block[1]) as Registration[]) : []
  const local = (path: string): string =>
    relative(root, join(projectRoot, path)).replaceAll('\\', '/')
  const clients = new Map(
    modules.map(({ path, view, routes }) => [
      local(path),
      { path: local(path), ...(view ? { view: local(view) } : {}), routes },
    ]),
  )
  const keptPaths = new Set(kept.map(local))
  const next: Registration[] = []
  for (const registration of registrations) {
    const sameGenerator =
      registration.args[0] === args[0] &&
      (args[0] === '--contract' || registration.args[1] === args[1])
    if (sameGenerator) {
      for (const client of registration.clients) {
        if (keptPaths.has(client.path) && !clients.has(client.path))
          clients.set(client.path, client)
      }
    } else {
      const others = registration.clients.filter(({ path }) => !clients.has(path))
      if (others.length) next.push({ ...registration, clients: others })
    }
  }
  if (clients.size) {
    const covered = new Set(
      [...clients.values()].flatMap(({ routes }) => routes.map(({ path }) => path)),
    )
    next.push({
      args,
      clients: [...clients.values()],
      uncovered: paths.filter((path) => !covered.has(path)),
    })
  }
  if (!block && next.length === 0) return
  next.sort((left, right) => left.args.join(' ').localeCompare(right.args.join(' ')))
  const data = JSON.stringify(next, null, 2)
  const generated = `${START}\n// prettier-ignore\n${DECLARATION}${data}\n${END}`
  const updated = block
    ? config.replace(BLOCK, () => generated)
    : config
        .replace(CLIENT_IMPORT, () => `${CLIENT_IMPORT}\n${ROUTE_IMPORT}\n\n${generated}`)
        .replace(
          CONFIG_EXPORT,
          (opening) =>
            opening +
            '\n  ...generatedResourceClientConfig(\n' +
            '    generatedResourceClients,\n' +
            '    import.meta.url,\n' +
            '    process.env.VITE_API_URL,\n' +
            '  ),',
        )
        .replace(
          "'molecule-local/fetch-hooks-use-the-query-cache': 'warn'",
          "'molecule-local/fetch-hooks-use-the-query-cache': 'error'",
        )
  // A config that runs @molecule/eslint-config gets the rule from that package. A config written
  // before the package imports the rule from its own eslint-rules/, so the file is supplied here.
  if (next.length && updated.includes(ROUTE_IMPORT)) {
    const rule = join(root, 'eslint-rules', RULE_FILE)
    await mkdir(dirname(rule), { recursive: true })
    try {
      const source = await readFile(
        new URL(`../../templates/shared/${RULE_FILE}`, import.meta.url),
        'utf8',
      )
      // The vendored rule is also used by other packages. Normalize the command when
      // writing it into a scaffold, leaving the vendored source in sync.
      await writeFile(rule, source.replace(/(?<=Run )mlcl(?= resources )/, CLI_COMMAND), {
        flag: 'wx',
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  }
  if (updated !== config) await writeFile(target, updated, 'utf8')
}
