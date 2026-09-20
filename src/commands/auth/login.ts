import { spawn } from 'node:child_process'

import { Flags } from '@oclif/core'
import { Command } from '@oclif/core'

import {
  AuthorizationPendingError,
  PlatformApiError,
  pollDeviceToken,
  requestDeviceCode,
  siteBaseUrl,
  whoami,
  writeCredentials,
} from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'

/** Best-effort browser open (no new dependency; silently skips on failure). */
function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  try {
    const child = spawn(cmd, [url], { stdio: 'ignore', detached: true })
    child.unref()
  } catch (_error) {
    // No browser opener on this machine — the URL is printed either way, so
    // failing to open is a non-event, not a failure to handle.
  }
}

export default class Login extends Command {
  static override aliases = ['login']
  static override description =
    'Log the CLI in to molecule.dev — opens your browser to approve (device-code flow); stores a 1-year token at ~/.mlcl/credentials.json'

  static override examples = [
    '<%= config.bin %> login',
    '<%= config.bin %> login --no-browser',
    '<%= config.bin %> login --token <jwt>',
  ]

  static override flags = {
    token: Flags.string({
      description:
        'Headless: pass a token directly instead of the browser flow (CI: prefer the MOLECULE_TOKEN env var).',
    }),
    'no-browser': Flags.boolean({
      description: 'Print the approval URL without trying to open a browser (SSH/remote).',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Login)

    if (flags.token) {
      await this.storeVerified(flags.token)
      return
    }

    // Device-code dance: print code + URL, open browser, poll until approved.
    let session
    try {
      session = await requestDeviceCode()
    } catch (error) {
      if (error instanceof PlatformApiError && error.status === 404) {
        this.error(
          'This molecule.dev API does not support CLI login yet (the /cli routes deploy with the platform). ' +
            'For local testing, start the molecule-dev dev server and run with MOLECULE_ENV=local ' +
            '(sets API→localhost:4000, site→localhost:3000, telemetry off).',
          { exit: 1 },
        )
      }
      throw error
    }
    const url = `${siteBaseUrl()}${session.verificationPath}`
    this.log(`\n${ui.heading('Log in to molecule.dev')}`)
    this.log(`  ${ui.dim('Code:')} ${ui.cmd(session.userCode)}`)
    this.log(`  ${ui.dim('Open:')} ${ui.cmd(url)}\n`)
    if (!flags['no-browser']) openBrowser(url)
    this.log(ui.dim('Waiting for approval…'))

    const deadline = Date.now() + session.expiresIn * 1000
    for (;;) {
      await new Promise((r) => setTimeout(r, session.interval * 1000))
      if (Date.now() > deadline)
        this.error('Login window expired — re-run mlcl login.', { exit: 1 })
      try {
        const token = await pollDeviceToken(session.deviceCode)
        await this.storeVerified(token)
        return
      } catch (error) {
        if (error instanceof AuthorizationPendingError) continue
        throw error
      }
    }
  }

  /** Verify before storing — a bad token should fail here, not on first use. */
  private async storeVerified(token: string): Promise<void> {
    const me = await whoami(token)
    writeCredentials({ token, email: me.email, savedAt: new Date().toISOString() })
    this.log(`${ui.check('Logged in')} as ${ui.id(me.email ?? me.id)}`)
    this.log(ui.dim('Token stored at ~/.mlcl/credentials.json (chmod 600).'))
  }
}
