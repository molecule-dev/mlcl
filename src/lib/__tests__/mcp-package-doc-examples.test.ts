import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import { searchPackageDoc } from '../../../mcp/src/package-doc-search.js'

const example = [
  '## Account setup',
  '```js',
  'const config = {',
  '  requestEnvelope: "member",',
  '  loginEndpoint: "/sessions",',
  '  registerEndpoint: "/members",',
  '  currentUserEndpoint: "/member",',
  '  profileEndpoint: "/member",',
  '  profileUpdateMethod: "PUT",',
  '  mapAuthResponse: (data) => ({ user: data.member }),',
  '}',
  '```',
].join('\n')

/** The code an author receives, with the reference tool's source line numbers removed. */
function deliveredCode(doc: string): string {
  const plain = doc.replace(/^\d+: /gm, '')
  return /```js\n([\s\S]*?)\n```/.exec(plain)?.[1] ?? ''
}

describe('copyable documentation search examples', () => {
  it('delivers the request adapter with the response adapter as executable configuration', () => {
    const result = searchPackageDoc(example, ['mapAuthResponse'])
    const code = deliveredCode(result.doc)
    expect(code).toContain('requestEnvelope: "member"')
    const config = runInNewContext(`${code}; config`) as {
      requestEnvelope: string
      mapAuthResponse: (data: unknown) => unknown
    }
    expect({ [config.requestEnvelope]: { email: 'operator@example.invalid' } }).toEqual({
      member: { email: 'operator@example.invalid' },
    })
    expect(config.mapAuthResponse({ member: { handle: 'operator' } })).toEqual({
      user: { handle: 'operator' },
    })
  })

  it('keeps a layout example complete when searching for its nested outlet', () => {
    const readme =
      '## Shell\n```tsx\n<AppShellLayout\n  header={<EquipmentHeader />}\n  footer={<EquipmentFooter />}\n>\n  <Outlet />\n</AppShellLayout>\n```'
    const doc = searchPackageDoc(readme, ['Outlet']).doc
    expect(doc).toContain('header={<EquipmentHeader />}')
    expect(doc).toContain('</AppShellLayout>')
    expect(doc).toContain('2: ```tsx')
    expect(doc).toContain('9: ```')
  })

  it('reserves one complete example even when earlier prose hits exhaust ordinary context', () => {
    const doc = searchPackageDoc(
      ('mapAuthResponse ' + 'x'.repeat(280) + '\n').repeat(30) + example,
      ['mapAuthResponse'],
    ).doc
    expect(deliveredCode(doc)).toContain('requestEnvelope: "member"')
    expect(doc).toContain('README matches truncated')
    expect(doc.length).toBeLessThan(6000)
  })

  it('prints a matching fence once even when several lines contain the search term', () => {
    const doc = searchPackageDoc(
      '## Example\n```js\nconst needle = 1\nconst other = needle + 2\n```',
      ['needle'],
    ).doc
    expect(doc.match(/const needle = 1/g)).toHaveLength(1)
    expect(doc.match(/const other = needle/g)).toHaveLength(1)
  })

  it.each(['```', '~~~'])(
    'requires a closing %s fence at least as long as its opener',
    (marker) => {
      const readme = `## Real\n${marker + marker[0]}text\nneedle\n${marker}\n# Not a heading\nstill in example\n${marker + marker[0]}`
      const doc = searchPackageDoc(readme, ['needle', 'still in example']).doc
      expect(doc).toContain('# Not a heading')
      expect(doc).not.toContain('section "Not a heading"')
      expect(doc).toContain('still in example')
    },
  )

  it('retains ordinary prose context without pulling in unrelated fenced examples', () => {
    const doc = searchPackageDoc(
      '## Usage\nBefore\nplain needle\nAfter\n```js\nconst unrelated = true\n```',
      ['needle'],
    ).doc
    expect(doc).toContain('2: Before\n3: plain needle\n4: After')
    expect(doc).not.toContain('unrelated')
  })

  it('keeps huge or unclosed examples bounded and retains their literal hit', () => {
    for (const close of ['', '\n```']) {
      const doc = searchPackageDoc(
        '## Huge\n```js\n' +
          'const padding = 1\n'.repeat(300) +
          'const needle = 2\n' +
          'const padding = 1\n'.repeat(300) +
          close,
        ['needle'],
      ).doc
      expect(doc).toContain('const needle = 2')
      expect(doc.length).toBeLessThan(6000)
      expect(doc).not.toContain('2: ```js')
    }
  })

  it('does not lose a hit when line-number overhead makes a short example exceed its budget', () => {
    const doc = searchPackageDoc('## Long lines\n```js\n' + '\n'.repeat(700) + 'needle\n```', [
      'needle',
    ]).doc
    expect(doc).toContain('needle')
    expect(doc).not.toContain('No matches')
    expect(doc.length).toBeLessThan(6000)
  })
})
