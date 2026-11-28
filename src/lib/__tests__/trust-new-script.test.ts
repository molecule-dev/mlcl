import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

import ts from 'typescript'
import { expect, it } from 'vitest'

it('retries the same npm publish OTP refusal under a silent parent', async () => {
  const source = readFileSync(
    new URL('../../../scripts/trust-new-packages.mjs', import.meta.url),
    'utf8',
  )
  const ast = ts.createSourceFile('trust-new-packages.mjs', source, ts.ScriptTarget.Latest, true)
  const publish = ast.statements.find(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'publishFirst',
  )
  const otp = ast.statements.find(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (declaration) => declaration.name.getText(ast) === 'otpRefused',
      ),
  )
  if (!publish || !otp) throw new Error('missing staged publish or its OTP classifier')
  const root = mkdtempSync(join(tmpdir(), 'mlcl-trust-npm-'))
  try {
    const bin = join(root, 'bin')
    const dir = join(root, 'package')
    mkdirSync(bin)
    mkdirSync(dir)
    writeFileSync(join(dir, 'package.json'), '{"name":"fixture","version":"1.0.0","private":true}')
    writeFileSync(
      join(bin, 'npm'),
      `#!/bin/sh
level=\${npm_config_loglevel:-notice}
for arg do case "$arg" in --loglevel=*) level=\${arg#*=};; esac; done
case " $* " in *' --otp 000001 '*)
  if [ "$level" != silent ]; then printf '%s\\n' 'npm error code EOTP' >&2; fi
  exit 1;;
esac
printf '%s\\n' 'npm error code E403' >&2
exit 1
`,
      { mode: 0o755 },
    )
    const run = async (loglevel: string): Promise<unknown> => {
      const prompts: string[] = []
      const output: string[] = []
      const result = await runInNewContext(
        `${otp.getText(ast)}\n${publish.getText(ast)}\npublishFirst(pkg)`,
        {
          pkg: { name: 'fixture', version: '1.0.0', dir },
          cpSync,
          join,
          mkdtempSync,
          readFileSync,
          rmSync,
          writeFileSync,
          tmpdir: () => root,
          ask: async (label: string) => {
            prompts.push(label)
            return `00000${prompts.length}`
          },
          console: { log: () => undefined, error: (text: string) => output.push(text) },
          spawnSync: (command: string, args: string[], options: object) =>
            spawnSync(command, args, {
              ...options,
              stdio: ['ignore', 'pipe', 'pipe'],
              env: { PATH: bin, npm_config_loglevel: loglevel },
            }),
        },
      )
      return { result, prompts, output }
    }
    const normal = await run('notice')
    expect(normal).toEqual({
      result: false,
      prompts: ['publishing fixture', 'publishing fixture (the last code was refused)'],
      output: ['npm error code E403'],
    })
    expect(await run('silent')).toEqual(normal)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
