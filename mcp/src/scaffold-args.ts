/** Arguments accepted by the MCP scaffold_project tool. */
export interface ScaffoldProjectOptions {
  name: string
  template?: string
  type?: string
  framework?: string
  packages?: string
  api_contract?: string
  skip_install?: boolean
}

/** Build the real CLI call; auth derivation stays in mlcl's shared scaffold. */
export function scaffoldProjectCliArgs(options: ScaffoldProjectOptions): string[] {
  const args = ['create', options.name, '--no-interactive', '--json']
  if (options.template) args.push('--template', options.template)
  if (options.type) args.push('--type', options.type)
  if (options.framework) args.push('--framework', options.framework)
  if (options.packages) args.push('--packages', options.packages)
  if (options.api_contract) args.push('--api-contract', options.api_contract)
  if (options.skip_install) args.push('--skip-install')
  return args
}
