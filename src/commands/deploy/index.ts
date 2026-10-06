import { Command, Flags } from '@oclif/core'

import { createDeployment, getDeployment, readCredentials } from '../../lib/platform.js'
import { setTelemetryContext } from '../../lib/telemetry.js'
import { ui } from '../../lib/ui.js'

export default class Deploy extends Command {
  static override description =
    'Deploy a molecule.dev project to production (builds in the sandbox, launches the runtime container — same pipeline as the IDE\u2019s Deploy button)'

  static override examples = [
    '<%= config.bin %> deploy --project <id>',
    '<%= config.bin %> deploy --project <id> --follow',
  ]

  static override flags = {
    project: Flags.string({ char: 'p', description: 'molecule.dev project id', required: true }),
    follow: Flags.boolean({
      description: 'Poll until the deploy finishes and print the live URL',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Deploy)
    if (!readCredentials()) this.error('Not logged in — run `mlcl login` first.', { exit: 1 })

    this.log(ui.dim('Triggering deploy…'))
    const deployment = await createDeployment(flags.project)
    this.log(
      `${ui.check('Deployment started')} ${ui.id(deployment.id)} ${ui.dim(`(${deployment.status})`)}`,
    )

    if (!flags.follow) {
      this.log(
        ui.dim(
          '\nPoll with: mlcl deploy status --project <id> --deployment <id> (or --follow next time)',
        ),
      )
      return
    }

    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5_000))
      const state = await getDeployment(flags.project, deployment.id)
      // The platform's own states are pending | building | deploying | ready | failed | cancelled;
      // the older names stay accepted for a platform build that still sends them.
      if (
        state.status === 'ready' ||
        state.status === 'live' ||
        state.status === 'running' ||
        state.status === 'succeeded'
      ) {
        setTelemetryContext({ deployOutcome: 'succeeded' })
        const liveUrl = state.url ?? state.liveUrl
        this.log(
          `${ui.check('Live')} ${liveUrl ? ui.cmd(liveUrl) : ui.dim('(URL in the IDE dashboard)')}`,
        )
        return
      }
      setTelemetryContext({ deployOutcome: state.status })
      if (state.status === 'failed' || state.status === 'cancelled' || state.status === 'error') {
        this.log(ui.cross(`Deployment ${state.status}.`))
        if (state.buildLog) this.log(ui.dim(state.buildLog.split('\n').slice(-40).join('\n')))
        process.exitCode = 1
        return
      }
      this.log(ui.dim(`  ${state.status}…`))
    }
    this.log(ui.warn('Timed out waiting — check the IDE deployments panel.'))
  }
}
