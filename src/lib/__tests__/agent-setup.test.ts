/**
 * The setup engine: plan steps from the agent table, then apply them without
 * disturbing what the user already has. Runs against temp directories with an
 * injected PATH lookup and native-installer runner.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { type AgentEnvironment, findHarness } from '../agent-harnesses.js'
import {
  applySetup,
  type CliRunner,
  planSetup,
  SETUP_COMPONENTS,
  type SetupApplyOptions,
  type SetupStep,
  tomlDefinesTable,
} from '../agent-setup.js'
import { renderJsonConfigEntry } from '../json-config-entry.js'

const SKILLS = { 'capability-first/SKILL.md': '---\nname: capability-first\n---\nbody\n' }
const SECTION = '## Molecule\n\nUse mlcl.\n'

describe('renderJsonConfigEntry', () => {
  it('adds the entry, keeping comments and trailing commas', () => {
    const { text, result } = renderJsonConfigEntry(
      '{\n  // servers\n  "mcpServers": { "a": {} },\n}\n',
      ['mcpServers'],
      'molecule',
      { command: 'npx' },
    )
    expect(result).toBe('added')
    expect(text).toContain('// servers')
    expect(text).toContain('"molecule": {')
  })

  it('adds only missing keys to an existing entry, never changing the user’s values', () => {
    const before = '{"mcpServers":{"molecule":{"command":"node","env":{"X":"1"}}}}'
    const { text, result } = renderJsonConfigEntry(before, ['mcpServers'], 'molecule', {
      command: 'npx',
      tools: ['*'],
    })
    expect(result).toBe('updated')
    const cfg = JSON.parse(text)
    expect(cfg.mcpServers.molecule).toEqual({ command: 'node', env: { X: '1' }, tools: ['*'] })
    expect(renderJsonConfigEntry(text, ['mcpServers'], 'molecule', { command: 'npx' }).result).toBe(
      'present',
    )
  })

  it('handles a flat dotted key as one key (Amp)', () => {
    const { text } = renderJsonConfigEntry('', ['amp.mcpServers'], 'molecule', { command: 'npx' })
    expect(JSON.parse(text)).toEqual({ 'amp.mcpServers': { molecule: { command: 'npx' } } })
  })

  it('keeps tab indentation', () => {
    const { text } = renderJsonConfigEntry('{\n\t"a": 1\n}\n', ['mcpServers'], 'molecule', {})
    expect(text).toMatch(/^\t"mcpServers"/m)
  })

  it('refuses text that does not parse, and a path through a non-object', () => {
    expect(() => renderJsonConfigEntry('{ "a": ', ['mcpServers'], 'm', {})).toThrow(
      /not valid JSON/,
    )
    expect(() => renderJsonConfigEntry('{"mcp": "x"}', ['mcp', 'servers'], 'm', {})).toThrow(
      /"mcp" is not an object/,
    )
    expect(() => renderJsonConfigEntry('[]', ['mcpServers'], 'm', {})).toThrow(/top level/)
  })
})

describe('tomlDefinesTable', () => {
  const table = 'mcp_servers.molecule'
  it.each([
    ['[mcp_servers.molecule]\ncommand = "npx"\n'],
    ['[ mcp_servers . molecule ]\n'],
    ['[mcp_servers.molecule.env]\nX = "1"\n'],
    ['mcp_servers.molecule.command = "npx"\n'],
    ['[mcp_servers]\nmolecule = { command = "npx" }\n'],
    ['[mcp_servers]\nmolecule.command = "npx"\n'],
  ])('finds %j', (text) => {
    expect(tomlDefinesTable(text, table)).toBe(true)
  })

  it.each([
    [''],
    ['[mcp_servers.other]\ncommand = "x"\n'],
    ['[mcp_servers]\nother = {}\n[profiles]\nmolecule = "x"\n'],
    ['# [mcp_servers.molecule]\n'],
    ['model = "o3"\n'],
  ])('does not find %j', (text) => {
    expect(tomlDefinesTable(text, table)).toBe(false)
  })
})

describe('planSetup', () => {
  let home: string
  let cwd: string
  const env = (onPath: string[] = []): AgentEnvironment => ({
    home,
    cwd,
    env: {},
    onPath: (bin) => onPath.includes(bin),
  })
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'setup-plan-home-'))
    cwd = mkdtempSync(join(tmpdir(), 'setup-plan-proj-'))
  })
  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
    rmSync(cwd, { recursive: true, force: true })
  })
  const plan = (scope: 'machine' | 'project', ids: string[], onPath: string[] = []): SetupStep[] =>
    planSetup({
      scope,
      harnesses: ids.map((id) => findHarness(id)!),
      components: new Set(SETUP_COMPONENTS),
      env: env(onPath),
      skills: SKILLS,
    })

  it('machine scope: native installers with the user scope, one shared ~/.agents/skills copy', () => {
    const steps = plan(
      'machine',
      ['claude-code', 'codex', 'cursor', 'gemini'],
      ['claude', 'codex', 'gemini'],
    )
    const clis = steps.flatMap((s) =>
      s.kind === 'mcp' && s.target.kind === 'cli' ? [s.target] : [],
    )
    expect(clis.map((c) => [c.bin, ...c.args].join(' '))).toEqual([
      'claude mcp add --scope user molecule -- npx -y molecule-mcp',
      'codex mcp add molecule -- npx -y molecule-mcp',
      'gemini mcp add -s user molecule npx -y molecule-mcp',
    ])
    const skills = steps.filter((s) => s.kind === 'skill')
    expect(skills.map((s) => [s.kind === 'skill' && s.path, s.agents])).toEqual([
      [join(home, '.claude', 'skills', 'capability-first', 'SKILL.md'), ['Claude Code']],
      [
        join(home, '.agents', 'skills', 'capability-first', 'SKILL.md'),
        ['Codex', 'Cursor', 'Gemini CLI'],
      ],
    ])
    const sections = steps.flatMap((s) => (s.kind === 'section' ? [s.path] : []))
    expect(sections).toEqual([
      join(home, '.claude', 'CLAUDE.md'),
      join(home, '.codex', 'AGENTS.md'),
      join(home, '.gemini', 'GEMINI.md'),
    ])
    expect(steps.some((s) => s.kind === 'note' && /Cursor keeps user rules/.test(s.text))).toBe(
      true,
    )
    // Nothing lands in the project.
    for (const s of steps) if ('path' in s) expect(s.path.startsWith(cwd)).toBe(false)
  })

  it('project scope: one AGENTS.md section and one merged .mcp.json entry for every agent', () => {
    const steps = plan('project', ['claude-code', 'copilot', 'codex', 'opencode'])
    const agentsMd = steps.filter((s) => s.kind === 'section' && s.path === join(cwd, 'AGENTS.md'))
    expect(agentsMd).toHaveLength(1)
    expect(agentsMd[0].agents).toEqual([
      'Claude Code',
      'GitHub Copilot (VS Code, Copilot CLI)',
      'Codex',
      'OpenCode',
    ])
    const mcpJson = steps.filter(
      (s) =>
        s.kind === 'mcp' && s.target.kind === 'json' && s.target.path === join(cwd, '.mcp.json'),
    )
    expect(mcpJson).toHaveLength(1)
    expect(
      mcpJson[0].kind === 'mcp' &&
        mcpJson[0].target.kind === 'json' &&
        mcpJson[0].target.entry.tools,
    ).toEqual(['*'])
    // Copilot reads .github/skills, Claude .claude/skills, Codex/OpenCode .agents/skills.
    const dirs = steps.flatMap((s) =>
      s.kind === 'skill' ? [s.path.slice(cwd.length + 1).split('/')[0]] : [],
    )
    expect(dirs).toEqual(['.claude', '.github', '.agents'])
    for (const s of steps) if ('path' in s) expect(s.path.startsWith(home)).toBe(false)
  })

  it('Claude Code with no CLAUDE.md: the section goes in AGENTS.md and a new CLAUDE.md imports it (OLD MUSTFAIL)', () => {
    // Claude Code skips AGENTS.md when any folder above the project has a CLAUDE.md,
    // and before v2.1.277; the import is the documented way that works in every case.
    const instructions = plan('project', ['claude-code']).flatMap((s) =>
      s.kind === 'section' || s.kind === 'import' ? [[s.kind, s.path]] : [],
    )
    expect(instructions).toEqual([
      ['section', join(cwd, 'AGENTS.md')],
      ['import', join(cwd, 'CLAUDE.md')],
    ])
  })

  it('Claude Code project instructions follow an existing CLAUDE.md', () => {
    writeFileSync(join(cwd, 'CLAUDE.md'), '# rules\n')
    const sections = plan('project', ['claude-code']).flatMap((s) =>
      s.kind === 'section' ? [s.path] : [],
    )
    expect(sections).toEqual([join(cwd, 'CLAUDE.md')])
    writeFileSync(join(cwd, 'CLAUDE.md'), '# rules\n@AGENTS.md\n')
    const imported = plan('project', ['claude-code']).flatMap((s) =>
      s.kind === 'section' ? [s.path] : [],
    )
    expect(imported).toEqual([join(cwd, 'AGENTS.md')])
    expect(plan('project', ['claude-code']).some((s) => s.kind === 'import')).toBe(false)
  })

  it('reads an import in .claude/CLAUDE.md from that folder (OLD MUSTFAIL: @AGENTS.md there is .claude/AGENTS.md)', () => {
    mkdirSync(join(cwd, '.claude'))
    const nested = join(cwd, '.claude', 'CLAUDE.md')
    const sections = (): string[] =>
      plan('project', ['claude-code']).flatMap((s) => (s.kind === 'section' ? [s.path] : []))
    writeFileSync(nested, '@AGENTS.md\n')
    expect(sections()).toEqual([nested])
    writeFileSync(nested, '# rules\n@../AGENTS.md\n')
    expect(sections()).toEqual([join(cwd, 'AGENTS.md')])
  })

  it('says so when an agent has no MCP config at a scope', () => {
    const steps = plan('project', ['cline'])
    expect(steps.filter((s) => s.component === 'mcp')).toEqual([
      expect.objectContaining({
        kind: 'note',
        component: 'mcp',
        text: expect.stringMatching(/Cline has no documented MCP config/),
      }),
    ])
  })

  /** Where one agent's instructions and skills go: `section`/`file` paths, relative. */
  const placed = (
    scope: 'machine' | 'project',
    id: string,
  ): { instructions: string[]; skills: string[] } => {
    const steps = plan(scope, [id])
    const rel = (path: string): string =>
      path.startsWith(cwd) ? path.slice(cwd.length + 1) : `~/${path.slice(home.length + 1)}`
    return {
      instructions: steps.flatMap((s) =>
        s.kind === 'section' || s.kind === 'file' ? [rel(s.path)] : [],
      ),
      skills: steps.flatMap((s) =>
        s.kind === 'skill' ? [rel(s.path).replace('/capability-first/SKILL.md', '')] : [],
      ),
    }
  }

  it('gives the agents that once got only the MCP server their rules files and skills (OLD MUSTFAIL)', () => {
    expect(
      Object.fromEntries(
        ['zed', 'crush', 'trae', 'cline', 'junie', 'continue', 'goose'].map((id) => [
          id,
          [placed('machine', id), placed('project', id)],
        ]),
      ),
    ).toEqual({
      zed: [
        { instructions: ['~/.config/zed/AGENTS.md'], skills: ['~/.agents/skills'] },
        { instructions: ['AGENTS.md'], skills: ['.agents/skills'] },
      ],
      crush: [
        { instructions: ['~/.config/crush/CRUSH.md'], skills: ['~/.agents/skills'] },
        { instructions: ['AGENTS.md'], skills: ['.agents/skills'] },
      ],
      trae: [
        { instructions: [], skills: ['~/.trae/skills'] },
        { instructions: ['.trae/rules/molecule.md'], skills: ['.trae/skills'] },
      ],
      cline: [
        { instructions: ['~/Documents/Cline/Rules/molecule.md'], skills: ['~/.agents/skills'] },
        { instructions: ['AGENTS.md'], skills: ['.agents/skills'] },
      ],
      junie: [
        { instructions: ['~/.junie/AGENTS.md'], skills: ['~/.agents/skills'] },
        { instructions: ['AGENTS.md'], skills: ['.agents/skills'] },
      ],
      continue: [
        { instructions: ['~/.continue/rules/molecule.md'], skills: ['~/.continue/skills'] },
        { instructions: ['.continue/rules/molecule.md'], skills: ['.continue/skills'] },
      ],
      goose: [
        { instructions: ['~/.config/goose/.goosehints'], skills: ['~/.agents/skills'] },
        { instructions: ['AGENTS.md'], skills: ['.agents/skills'] },
      ],
    })
    expect(plan('machine', ['trae'])).toContainEqual(
      expect.objectContaining({ kind: 'note', text: expect.stringMatching(/Settings → Rules/) }),
    )
    const rules = (id: string): string[] =>
      plan('project', [id]).flatMap((s) => (s.kind === 'file' ? [s.frontmatter] : []))
    expect(rules('trae')).toEqual(['---\nalwaysApply: true\n---\n\n'])
    expect(rules('continue')).toEqual(['---\nname: Molecule\nalwaysApply: true\n---\n\n'])
  })

  it('puts Zed’s section in the one rules file it reads, never a new AGENTS.md beside it', () => {
    writeFileSync(join(cwd, 'CLAUDE.md'), '# rules\n')
    expect(placed('project', 'zed').instructions).toEqual(['CLAUDE.md'])
    writeFileSync(join(cwd, 'AGENTS.md'), '# agents\n')
    expect(placed('project', 'zed').instructions).toEqual(['AGENTS.md'])
    // Cline's `.clinerules` is often a folder: Zed reads files only.
    mkdirSync(join(cwd, '.clinerules'))
    expect(placed('project', 'zed').instructions).toEqual(['AGENTS.md'])
    writeFileSync(join(cwd, '.rules'), 'be brief\n')
    expect(placed('project', 'zed').instructions).toEqual(['.rules'])
  })

  it('joins the guidelines level Junie reads now', () => {
    const junie = join(cwd, '.junie')
    mkdirSync(join(junie, 'guidelines'), { recursive: true })
    expect(placed('project', 'junie').instructions).toEqual(['.junie/guidelines/molecule.md'])
    writeFileSync(join(junie, 'guidelines.md'), '# old\n')
    expect(placed('project', 'junie').instructions).toEqual(['.junie/guidelines.md'])
    writeFileSync(join(cwd, 'AGENTS.md'), '# agents\n')
    expect(placed('project', 'junie').instructions).toEqual(['AGENTS.md'])
    writeFileSync(join(junie, 'AGENTS.md'), '# junie\n')
    expect(placed('project', 'junie').instructions).toEqual(['.junie/AGENTS.md'])
  })

  it('reads XDG_CONFIG_HOME for the agents that keep rules in their config folder', () => {
    const xdg = join(home, 'xdg')
    const steps = planSetup({
      scope: 'machine',
      harnesses: ['zed', 'crush', 'goose'].map((id) => findHarness(id)!),
      components: new Set(['instructions']),
      env: { ...env(), env: { XDG_CONFIG_HOME: xdg } },
      skills: SKILLS,
    })
    expect(steps.flatMap((s) => (s.kind === 'section' ? [s.path] : []))).toEqual([
      join(xdg, 'zed', 'AGENTS.md'),
      join(xdg, 'crush', 'CRUSH.md'),
      join(xdg, 'goose', '.goosehints'),
    ])
  })
})

describe('applySetup', () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'setup-apply-'))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })
  const runner =
    (answers: Record<string, { ok: boolean; output: string }>): CliRunner =>
    async (bin) =>
      answers[bin] ?? { ok: true, output: 'Added\n' }
  const options = (runCli: CliRunner = runner({}), force = false): SetupApplyOptions => ({
    instructions: SECTION,
    cwd: dir,
    force,
    runCli,
  })

  it('treats "already exists" from a native installer as done, and reports a real failure without stopping', async () => {
    const steps: SetupStep[] = [
      {
        kind: 'mcp',
        component: 'mcp',
        agents: ['A'],
        target: { kind: 'cli', bin: 'claude', args: ['mcp', 'add'] },
      },
      {
        kind: 'mcp',
        component: 'mcp',
        agents: ['B'],
        target: { kind: 'cli', bin: 'gemini', args: ['mcp', 'add'] },
      },
      { kind: 'section', component: 'instructions', agents: ['A'], path: join(dir, 'AGENTS.md') },
    ]
    const results = await applySetup(
      steps,
      options(
        runner({
          claude: { ok: false, output: 'MCP server molecule already exists in user config' },
          gemini: { ok: false, output: 'boom: no permission' },
        }),
      ),
    )
    expect(results.map((r) => r.status)).toEqual(['present', 'failed', 'written'])
    expect(results[1].detail).toContain('boom: no permission')
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toBe(SECTION)
  })

  it('keeps an edited skill unless forced, and writes a rules file with its frontmatter', async () => {
    const skill = join(dir, 'skills', 'capability-first', 'SKILL.md')
    const rule = join(dir, 'steering', 'molecule.md')
    const steps: SetupStep[] = [
      { kind: 'skill', component: 'skills', agents: ['A'], path: skill, content: 'v2\n' },
      {
        kind: 'file',
        component: 'instructions',
        agents: ['K'],
        path: rule,
        frontmatter: '---\ninclusion: always\n---\n\n',
      },
    ]
    expect((await applySetup(steps, options())).map((r) => r.status)).toEqual([
      'written',
      'written',
    ])
    expect(readFileSync(rule, 'utf8')).toBe(`---\ninclusion: always\n---\n\n${SECTION}`)
    expect((await applySetup(steps, options())).map((r) => r.status)).toEqual([
      'present',
      'present',
    ])
    writeFileSync(skill, 'my edits\n')
    expect((await applySetup(steps, options()))[0].status).toBe('kept')
    expect(readFileSync(skill, 'utf8')).toBe('my edits\n')
    expect((await applySetup(steps, options(runner({}), true)))[0].status).toBe('updated')
    expect(readFileSync(skill, 'utf8')).toBe('v2\n')
  })

  it('appends the Codex TOML table to an existing config without touching the rest', async () => {
    const path = join(dir, '.codex', 'config.toml')
    mkdirSync(join(dir, '.codex'))
    writeFileSync(path, 'model = "o3"\n')
    const step: SetupStep = {
      kind: 'mcp',
      component: 'mcp',
      agents: ['Codex'],
      target: { kind: 'toml', path, table: 'mcp_servers.molecule', lines: ['command = "npx"'] },
    }
    expect((await applySetup([step], options()))[0].status).toBe('updated')
    expect((await applySetup([step], options()))[0].status).toBe('present')
    expect(readFileSync(path, 'utf8')).toBe(
      'model = "o3"\n\n[mcp_servers.molecule]\ncommand = "npx"\n',
    )
  })

  it('adds the import line once, keeping what the file already says', async () => {
    const path = join(dir, 'CLAUDE.md')
    const step: SetupStep = {
      kind: 'import',
      component: 'instructions',
      agents: ['A'],
      path,
      line: '@AGENTS.md',
    }
    const status = async (): Promise<string[]> =>
      (await applySetup([step], options())).map((r) => r.status)
    expect(await status()).toEqual(['written'])
    expect(readFileSync(path, 'utf8')).toBe('@AGENTS.md\n')
    expect(await status()).toEqual(['present'])
    writeFileSync(path, '# rules\n')
    expect(await status()).toEqual(['updated'])
    expect(readFileSync(path, 'utf8')).toBe('# rules\n\n@AGENTS.md\n')
    expect(await status()).toEqual(['present'])
  })

  it('writes the capability map beside the section only in the project AGENTS.md', async () => {
    const steps: SetupStep[] = [
      { kind: 'section', component: 'instructions', agents: ['A'], path: join(dir, 'AGENTS.md') },
      { kind: 'section', component: 'instructions', agents: ['G'], path: join(dir, 'GEMINI.md') },
    ]
    await applySetup(steps, { ...options(), capabilityMap: '## Declared capability map\n\n- x\n' })
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toContain('## Declared capability map')
    expect(readFileSync(join(dir, 'GEMINI.md'), 'utf8')).not.toContain('## Declared capability map')
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(false)
  })
})
