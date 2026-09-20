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
    // spawn failures (ENOENT — no opener on PATH) arrive ASYNC on the child's
    // 'error' event, not as a throw; without a listener they crash the process.
    child.on('error', () => {
      /* no opener — the URL is printed either way */
    })
    child.unref()
  } catch (_error) {
    // Synchronous spawn misuse only — same posture as above.
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
        'Headless: pass a token directly (EXPOSES it in the process list — prefer --with-token or the MOLECULE_TOKEN env var).',
    }),
    'with-token': Flags.boolean({
      description: 'Read the token from stdin (gh-style; safe for process lists).',
      default: false,
    }),
    'no-browser': Flags.boolean({
      description: 'Print the approval URL without trying to open a browser (SSH/remote).',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Login)

    if (flags['with-token']) {
      const token = await new Promise<string>((resolve) => {
        let data = ''
        process.stdin.setEncoding('utf8')
        process.stdin.on('data', (c) => (data += c))
        process.stdin.on('end', () => resolve(data.trim()))
        if (process.stdin.isTTY) process.stdin.resume()
      })
      if (!token) this.error('No token on stdin')
      await this.storeVerified(token)
      return
    }

    if (flags.token) {
      this.log(
        ui.warn(
          'Note: --token <value> is visible in the process list — prefer --with-token (stdin) next time.',
        ),
      )
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
    // A dev-stack restart (or any transient API blip) mid-poll must not kill
    // the login — tolerate consecutive network failures, bounded so a genuinely
    // dead endpoint still terminates before the code window closes.
    let consecutiveFailures = 0
    for (;;) {
      await new Promise((r) => setTimeout(r, session.interval * 1000))
      if (Date.now() > deadline)
        this.error('Login window expired — re-run mlcl login.', { exit: 1 })
      try {
        const token = await pollDeviceToken(session.deviceCode)
        await this.storeVerified(token)
        return
      } catch (error) {
        if (error instanceof AuthorizationPendingError) {
          consecutiveFailures = 0
          continue
        }
        if (consecutiveFailures < 10) {
          consecutiveFailures++
          continue
        }
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
