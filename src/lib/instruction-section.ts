/**
 * One generated top-level section inside a markdown instructions file
 * (`AGENTS.md`, `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, …).
 *
 * The file belongs to the user; only the section under the marker heading is
 * ours. Writing is idempotent: an existing section is kept unless `force`
 * replaces it, and replacing touches only the text from the marker heading up
 * to the next `## ` heading (or the end of the file).
 *
 * @module
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/** The heading `mlcl agent init` and `mlcl setup` write the conventions under. */
export const MOLECULE_SECTION_MARKER = '## Molecule'

/** What {@link ensureSection} did to the file. */
export type SectionWriteResult = 'created' | 'added' | 'replaced' | 'skipped'

function findHeading(text: string, marker: string): number {
  // Match the actual heading line, not the marker quoted inside the guidance
  // itself (the Inspect step names `## Declared capability map` in backticks).
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped}[\t ]*$`, 'm').exec(text)?.index ?? -1
}

function sectionEnd(text: string, start: number, marker: string): number {
  const after = text.indexOf('\n## ', start + marker.length)
  return after === -1 ? text.length : after + 1
}

/**
 * Compute the file content with the section written, without touching disk.
 *
 * @param existing - The file's current text (`''` when it does not exist).
 * @param body - The section, starting with its marker heading.
 * @param force - Replace an existing section instead of keeping it.
 * @param marker - The section's heading line.
 * @returns The new text and what changed; `text` is `existing` when skipped.
 */
export function renderSection(
  existing: string,
  body: string,
  force: boolean,
  marker = MOLECULE_SECTION_MARKER,
): { text: string; result: SectionWriteResult } {
  const markerIdx = findHeading(existing, marker)
  if (markerIdx !== -1 && !force) return { text: existing, result: 'skipped' }
  if (markerIdx !== -1) {
    const end = sectionEnd(existing, markerIdx, marker)
    return {
      text: existing.slice(0, markerIdx) + body.trimEnd() + '\n' + existing.slice(end),
      result: 'replaced',
    }
  }
  if (existing === '') return { text: `${body.trimEnd()}\n`, result: 'created' }
  return { text: `${existing.trimEnd()}\n\n${body.trimEnd()}\n`, result: 'added' }
}

/**
 * Ensure the section exists in a markdown instructions file.
 *
 * Writes through a symlink (a machine whose `~/.claude/CLAUDE.md` points at a
 * shared file keeps the link). The parent directory must exist.
 *
 * @param filePath - The instructions file.
 * @param body - The section, starting with its marker heading.
 * @param force - Replace an existing section instead of keeping it.
 * @param marker - The section's heading line.
 * @returns What changed.
 */
export function ensureSection(
  filePath: string,
  body: string,
  force: boolean,
  marker = MOLECULE_SECTION_MARKER,
): SectionWriteResult {
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : ''
  const { text, result } = renderSection(existing, body, force, marker)
  if (result !== 'skipped') writeFileSync(filePath, text)
  return result
}

/**
 * Remove one generated top-level section without touching its neighbours.
 *
 * @param filePath - The instructions file.
 * @param marker - The section's heading line.
 * @returns `true` when a section was removed.
 */
export function removeSection(filePath: string, marker: string): boolean {
  if (!existsSync(filePath)) return false
  const existing = readFileSync(filePath, 'utf8')
  const start = findHeading(existing, marker)
  if (start === -1) return false
  const end = sectionEnd(existing, start, marker)
  writeFileSync(filePath, existing.slice(0, start) + existing.slice(end))
  return true
}
