/**
 * The setup engine: plan steps from the agent table, then apply them without
 * disturbing what the user already has. Runs against temp directories with an
 * injected PATH lookup and native-installer runner.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type AgentEnvironment,
  CODEX_MCP_ENV_LINE,
  CODEX_UP_FRONT_TOOLS,
  findHarness,
} from '../agent-harnesses.js'
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

  it('machine scope: native installers with the user scope, skills only where no instructions go', () => {
    const steps = plan(
      'machine',
      ['claude-code', 'codex', 'cursor', 'gemini'],
      ['claude', 'codex', 'gemini'],
    )
    const clis = steps.flatMap((s) =>
      s.kind === 'mcp' && s.target.kind === 'cli' ? [s.target] : [],
    )
    // The installed copy of the server, never npx (lib/mcp-machine-install.ts).
    const run = join(home, '.mlcl', 'mcp', 'run.mjs')
    expect(clis.map((c) => [c.bin, ...c.args].join(' '))).toEqual([
      `claude mcp add --scope user molecule -- node ${run}`,
      `codex mcp add molecule -- node ${run}`,
      `gemini mcp add -s user molecule node ${run}`,
    ])
    // Cursor keeps user rules in its settings, so the skills are its copy of the guidance; Codex
    // and Gemini read the same ~/.agents/skills, which keeps the skill for Cursor.
    const skills = steps.filter((s) => s.kind === 'skill')
    expect(skills.map((s) => [s.kind === 'skill' && s.path, s.agents])).toEqual([
      [join(home, '.agents', 'skills', 'capability-first', 'SKILL.md'), ['Cursor']],
    ])
    // Claude Code gets the CLAUDE.md section, and an earlier setup's copy of the skill goes.
    const retired = steps.filter((s) => s.kind === 'retire-skill')
    expect(retired.map((s) => [s.kind === 'retire-skill' && s.path, s.agents])).toEqual([
      [join(home, '.claude', 'skills', 'capability-first', 'SKILL.md'), ['Claude Code']],
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

  it('installs the skills for every agent when the instructions are left out, and retires an old one', () => {
    const steps = planSetup({
      scope: 'machine',
      harnesses: ['claude-code', 'codex'].map((id) => findHarness(id)!),
      components: new Set(['mcp', 'skills'] as const),
      env: env(['claude', 'codex']),
      skills: SKILLS,
      retiredSkills: { 'old-skill/SKILL.md': 'old\n' },
    })
    const paths = (kind: SetupStep['kind']): string[] =>
      steps.flatMap((s) => (s.kind === kind && 'path' in s ? [s.path.slice(home.length + 1)] : []))
    expect(paths('skill')).toEqual([
      '.claude/skills/capability-first/SKILL.md',
      '.agents/skills/capability-first/SKILL.md',
    ])
    expect(paths('retire-skill')).toEqual([
      '.claude/skills/old-skill/SKILL.md',
      '.agents/skills/old-skill/SKILL.md',
    ])
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
    // Every one of them reads the AGENTS.md section (Claude Code through its CLAUDE.md import), so
    // no skill is written; an earlier setup's copies in .claude/, .github/ and .agents/ go.
    expect(steps.filter((s) => s.kind === 'skill')).toEqual([])
    const dirs = steps.flatMap((s) =>
      s.kind === 'retire-skill' ? [s.path.slice(cwd.length + 1).split('/')[0]] : [],
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

  it('gives the agents that once got only the MCP server their rules files, or skills where none exist (OLD MUSTFAIL)', () => {
    expect(
      Object.fromEntries(
        ['zed', 'crush', 'trae', 'cline', 'junie', 'continue', 'goose'].map((id) => [
          id,
          [placed('machine', id), placed('project', id)],
        ]),
      ),
    ).toEqual({
      zed: [
        { instructions: ['~/.config/zed/AGENTS.md'], skills: [] },
        { instructions: ['AGENTS.md'], skills: [] },
      ],
      crush: [
        { instructions: ['~/.config/crush/CRUSH.md'], skills: [] },
        { instructions: ['AGENTS.md'], skills: [] },
      ],
      // Trae keeps user rules in its settings: machine-wide, the skills are its guidance.
      trae: [
        { instructions: [], skills: ['~/.trae/skills'] },
        { instructions: ['.trae/rules/molecule.md'], skills: [] },
      ],
      cline: [
        { instructions: ['~/Documents/Cline/Rules/molecule.md'], skills: [] },
        { instructions: ['AGENTS.md'], skills: [] },
      ],
      junie: [
        { instructions: ['~/.junie/AGENTS.md'], skills: [] },
        { instructions: ['AGENTS.md'], skills: [] },
      ],
      continue: [
        { instructions: ['~/.continue/rules/molecule.md'], skills: [] },
        { instructions: ['.continue/rules/molecule.md'], skills: [] },
      ],
      goose: [
        { instructions: ['~/.config/goose/.goosehints'], skills: [] },
        { instructions: ['AGENTS.md'], skills: [] },
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

  it('removes a retired skill an earlier setup wrote, keeps an edited one until forced', async () => {
    const skill = (name: string): string => join(dir, 'skills', name, 'SKILL.md')
    const retire = (name: string): SetupStep => ({
      kind: 'retire-skill',
      component: 'skills',
      agents: ['A'],
      path: skill(name),
      content: 'v1\n',
    })
    for (const name of ['unedited', 'edited']) {
      mkdirSync(join(dir, 'skills', name), { recursive: true })
      writeFileSync(skill(name), name === 'edited' ? 'my edits\n' : 'v1\n')
    }
    const steps = ['unedited', 'edited', 'never-installed'].map(retire)
    expect((await applySetup(steps, options())).map((r) => r.status)).toEqual([
      'removed',
      'kept',
      'absent',
    ])
    // The skill's folder goes with it; the edited copy stays as the user left it.
    expect(existsSync(join(dir, 'skills', 'unedited'))).toBe(false)
    expect(readFileSync(skill('edited'), 'utf8')).toBe('my edits\n')
    expect((await applySetup(steps, options(runner({}), true))).map((r) => r.status)).toEqual([
      'absent',
      'removed',
      'absent',
    ])
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

describe('Codex MCP limits', () => {
  // Codex's defaults (10 s to start, 60 s per tool call) cut a first `npx -y molecule-mcp` start
  // and a scaffold or add_package call short. `codex mcp add` has no flag for them and rewrites the
  // whole table each time it runs, so setup adds them to the table and never re-runs the installer
  // over one that exists.
  let home: string
  let codexHome: string
  let config: string
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'setup-codex-home-'))
    codexHome = join(home, '.codex')
    config = join(codexHome, 'config.toml')
  })
  afterEach(() => {
    rmSync(home, { recursive: true, force: true })
  })
  const steps = (onPath: string[]): SetupStep[] => {
    const codex = findHarness('codex')
    if (!codex) throw new Error('no codex harness')
    return planSetup({
      scope: 'machine',
      harnesses: [codex],
      components: new Set(['mcp']),
      env: {
        home,
        cwd: home,
        env: { CODEX_HOME: codexHome },
        onPath: (bin) => onPath.includes(bin),
      },
      skills: {},
    })
  }
  /** `codex mcp add` as Codex runs it: the table is replaced with command and args alone. */
  const calls: string[] = []
  const codexAdd: CliRunner = async (bin, args) => {
    calls.push([bin, ...args].join(' '))
    const text = existsSync(config) ? readFileSync(config, 'utf8') : ''
    const kept = text
      .split(/\n(?=\[)/)
      .filter((block) => !block.startsWith('[mcp_servers.molecule]'))
    mkdirSync(codexHome, { recursive: true })
    const [command, ...rest] = args.slice(args.indexOf('--') + 1)
    const table = `[mcp_servers.molecule]\ncommand = "${command}"\nargs = ${JSON.stringify(rest).replace(/","/g, '", "')}\n`
    writeFileSync(config, [...kept.filter((b) => b.trim()), table].join('\n'))
    return { ok: true, output: "Added global MCP server 'molecule'.\n" }
  }
  const apply = async (planned: SetupStep[]): Promise<string[]> =>
    (
      await applySetup(planned, { instructions: '', cwd: home, force: false, runCli: codexAdd })
    ).map((r) => r.status)
  const limits = (text: string): Record<string, number> => {
    const block = text.split('[mcp_servers.molecule]')[1]?.split(/\n\[/)[0] ?? ''
    return Object.fromEntries(
      [...block.matchAll(/^(startup_timeout_sec|tool_timeout_sec) = (\d+)$/gm)].map((m) => [
        m[1],
        Number(m[2]),
      ]),
    )
  }

  beforeEach(() => {
    calls.length = 0
  })

  const run = (): string => join(home, '.mlcl', 'mcp', 'run.mjs')
  const tools = `[${CODEX_UP_FRONT_TOOLS.map((name) => `"${name}"`).join(', ')}]`
  /** The two tables a split install ends with: the first-step tools up front, the rest deferred. */
  const split = {
    molecule: [`enabled_tools = ${tools}`, 'omit_tools_from = ["deferred"]'],
    more: (
      command = `command = "node"
args = ["${run()}"]`,
    ) =>
      `[mcp_servers.molecule_more]
${command}
startup_timeout_sec = 120
tool_timeout_sec = 660
${CODEX_MCP_ENV_LINE}
disabled_tools = ${tools}
`,
  }

  it('runs codex mcp add once, then adds both limits to the table it wrote', async () => {
    expect(await apply(steps(['codex']))).toEqual(['written', 'updated'])
    expect(calls).toEqual([`codex mcp add molecule -- node ${run()}`])
    expect(limits(readFileSync(config, 'utf8'))).toEqual({
      startup_timeout_sec: 120,
      tool_timeout_sec: 660,
    })
    expect(readFileSync(config, 'utf8')).toBe(
      `[mcp_servers.molecule]
command = "node"
args = ["${run()}"]
startup_timeout_sec = 120
tool_timeout_sec = 660
${CODEX_MCP_ENV_LINE}
${split.molecule.join('\n')}

${split.more()}`,
    )
    // A second setup leaves the table alone: re-running the installer would drop the limits.
    expect(await apply(steps(['codex']))).toEqual(['present', 'present'])
    expect(calls).toHaveLength(1)
    expect(limits(readFileSync(config, 'utf8'))).toEqual({
      startup_timeout_sec: 120,
      tool_timeout_sec: 660,
    })
  })

  // An older setup registered `npx -y molecule-mcp`: its command becomes the installed launcher.
  it('moves an install from an older setup to the launcher and adds the limits, keeping the user’s values and other tables', async () => {
    mkdirSync(codexHome, { recursive: true })
    const before = [
      'model = "gpt-6.2-sol"',
      '',
      '[mcp_servers.molecule]',
      'command = "npx"',
      'args = ["-y", "molecule-mcp"]',
      'tool_timeout_sec = 900',
      '',
      '[mcp_servers.molecule.env]',
      'DO_NOT_TRACK = "1"',
      '',
      '[profiles.fast]',
      'model = "x"',
      '',
    ].join('\n')
    writeFileSync(config, before)
    expect(await apply(steps(['codex']))).toEqual(['present', 'updated'])
    expect(calls).toEqual([])
    const after = readFileSync(config, 'utf8')
    expect(limits(after)).toEqual({ tool_timeout_sec: 900, startup_timeout_sec: 120 })
    expect(after).toBe(
      `${before
        .replace('command = "npx"', 'command = "node"')
        .replace('args = ["-y", "molecule-mcp"]', `args = ["${run()}"]`)
        .replace(
          'tool_timeout_sec = 900\n',
          `tool_timeout_sec = 900\nstartup_timeout_sec = 120\n${CODEX_MCP_ENV_LINE}\n${split.molecule.join('\n')}\n`,
        )
        .trimEnd()}\n\n${split.more()}`,
    )
  })

  // Counterexample: a command the user changed is theirs, whatever it names. The split would start
  // setup's server beside theirs, so their table keeps every tool and no second table is added.
  // It still runs a Molecule server, so it gains the variables that server reads, and only those.
  it('keeps a command the user pinned, without the split', async () => {
    mkdirSync(codexHome, { recursive: true })
    const before =
      '[mcp_servers.molecule]\ncommand = "npx"\nargs = ["-y", "molecule-mcp@0.3.0"]\nstartup_timeout_sec = 120\ntool_timeout_sec = 660\n'
    writeFileSync(config, before)
    expect(await apply(steps(['codex']))).toEqual(['present', 'updated'])
    expect(readFileSync(config, 'utf8')).toBe(`${before}${CODEX_MCP_ENV_LINE}\n`)
    expect(await apply(steps(['codex']))).toEqual(['present', 'present'])
  })

  // A user's own `env_vars` list is theirs: setup adds no second one and leaves it as written.
  it('keeps the user’s own env_vars', async () => {
    mkdirSync(codexHome, { recursive: true })
    const before = `[mcp_servers.molecule]\ncommand = "node"\nargs = ["${run()}"]\nstartup_timeout_sec = 120\ntool_timeout_sec = 660\nenv_vars = ["HTTPS_PROXY"]\n`
    writeFileSync(config, before)
    await apply(steps([]))
    const molecule = readFileSync(config, 'utf8').split('[mcp_servers.molecule_more]')[0]
    expect(molecule).toContain('env_vars = ["HTTPS_PROXY"]\n')
    expect(molecule.match(/^env_vars/gm)).toHaveLength(1)
  })

  it('writes the same tables without the codex CLI', async () => {
    expect(await apply(steps([]))).toEqual(['written'])
    expect(readFileSync(config, 'utf8')).toBe(
      `[mcp_servers.molecule]\ncommand = "node"\nargs = ["${run()}"]\nstartup_timeout_sec = 120\ntool_timeout_sec = 660\n${CODEX_MCP_ENV_LINE}\n${split.molecule.join('\n')}\n\n${split.more()}`,
    )
    expect(await apply(steps([]))).toEqual(['present'])
  })

  // A user who narrowed the up-front tools keeps their list; the second table is still added.
  it('keeps the user’s own enabled_tools on a setup-installed table', async () => {
    mkdirSync(codexHome, { recursive: true })
    const before = `[mcp_servers.molecule]\ncommand = "node"\nargs = ["${run()}"]\nenabled_tools = ["search_packages"]\n`
    writeFileSync(config, before)
    expect(await apply(steps([]))).toEqual(['updated'])
    const after = readFileSync(config, 'utf8')
    expect(after).toContain('enabled_tools = ["search_packages"]\nstartup_timeout_sec = 120')
    expect(after.match(/^enabled_tools/gm)).toHaveLength(1)
    expect(after.endsWith(split.more())).toBe(true)
  })

  it('splits a project config the same way, with its npx command', async () => {
    const codex = findHarness('codex')!
    const planned = planSetup({
      scope: 'project',
      harnesses: [codex],
      components: new Set(['mcp']),
      env: { home, cwd: home, env: {}, onPath: () => false },
      skills: {},
    })
    expect(await apply(planned)).toEqual(['written'])
    const npx = 'command = "npx"\nargs = ["-y", "molecule-mcp"]'
    expect(readFileSync(join(home, '.codex', 'config.toml'), 'utf8')).toBe(
      `[mcp_servers.molecule]\n${npx}\nstartup_timeout_sec = 120\ntool_timeout_sec = 660\n${CODEX_MCP_ENV_LINE}\n${split.molecule.join('\n')}\n\n${split.more(npx)}`,
    )
  })

  it.each([
    '[mcp_servers]\nmolecule = { command = "npx", args = ["-y", "molecule-mcp"] }\n',
    '[mcp_servers]\nmolecule.command = "npx"\nmolecule.args = ["-y", "molecule-mcp"]\n',
    'mcp_servers.molecule.command = "npx"\nmcp_servers.molecule.args = ["-y", "molecule-mcp"]\n',
    '[mcp_servers.molecule.env]\nHTTPS_PROXY = "http://proxy.test:8080"\n',
  ])('preserves a server without a standalone table block (%j)', async (before) => {
    mkdirSync(codexHome, { recursive: true })
    writeFileSync(config, before)
    expect(await apply(steps(['codex']))).toEqual(['present', 'present'])
    expect(readFileSync(config, 'utf8')).toBe(before)
  })

  it('preserves a quoted env_vars key in an existing table before adding other properties', async () => {
    mkdirSync(codexHome, { recursive: true })
    const before = `[mcp_servers."molecule"]\ncommand = "node"\nargs = ["${run()}"]\n'env_vars' = ["HTTPS_PROXY"]\n`
    writeFileSync(config, before)
    expect(await apply(steps(['codex']))).toEqual(['present', 'updated'])
    const [primary] = readFileSync(config, 'utf8').split('[mcp_servers.molecule_more]')
    expect(primary).toContain('\'env_vars\' = ["HTTPS_PROXY"]')
    expect(primary).not.toContain('\nenv_vars =')
    expect(primary).not.toContain('\n[mcp_servers.molecule]\n')
    expect(primary).toContain('\ntool_timeout_sec = 660\n')
    expect(await apply(steps(['codex']))).toEqual(['present', 'present'])
  })

  it('preserves a streamable HTTP registration', async () => {
    mkdirSync(codexHome, { recursive: true })
    const before = '[mcp_servers.molecule]\nurl = "https://molecule.test/mcp"\n'
    writeFileSync(config, before)
    expect(await apply(steps(['codex']))).toEqual(['present', 'present'])
    expect(readFileSync(config, 'utf8')).toBe(before)
  })

  it('adds env_vars alongside quoted command keys and the millisecond startup timeout', async () => {
    mkdirSync(codexHome, { recursive: true })
    const before =
      '[mcp_servers.molecule]\n"command" = "npx"\n"args" = ["-y", "molecule-mcp@0.3.0"]\nstartup_timeout_ms = 90000\n"tool_timeout_sec" = 900\n'
    writeFileSync(config, before)
    expect(await apply(steps(['codex']))).toEqual(['present', 'updated'])
    expect(readFileSync(config, 'utf8')).toBe(`${before}${CODEX_MCP_ENV_LINE}\n`)
    expect(await apply(steps(['codex']))).toEqual(['present', 'present'])
  })

  it('gives a tool call longer than the server lets the CLI run', async () => {
    const { CLI_TIMEOUT_DEFAULT_MS } = await import('../../../mcp/src/cli-command.js')
    const planned = steps([]).flatMap((s) =>
      s.kind === 'mcp' && s.target.kind === 'toml' ? [s.target] : [],
    )
    const tool = Number(/tool_timeout_sec = (\d+)/.exec(planned[0].lines.join('\n'))?.[1])
    expect(tool * 1000).toBeGreaterThan(CLI_TIMEOUT_DEFAULT_MS)
  })
})
