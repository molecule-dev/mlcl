import { Help, type Interfaces } from '@oclif/core'
import { CLI_COMMAND } from '#cli-command'

/** Render usage and examples with the same prefix, keeping Oclif's executable name intact. */
export default class CliHelp extends Help {
  constructor(config: Interfaces.Config, options?: Partial<Interfaces.HelpOptions>) {
    // Keep the real config as the receiver for methods that use the executable name
    // to read scoped environment variables.
    const displayConfig = new Proxy(config, {
      get(target, key) {
        if (key === 'bin') return CLI_COMMAND
        const value: unknown = Reflect.get(target, key, target)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    super(displayConfig, options)
  }
}
