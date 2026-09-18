import { describe, expect, it, vi } from 'vitest'

// The owner's "Display location metadata" preference (owner_prefs.showLocation) was never consumed —
// ExifPanel always rendered the GPS/location row, exposing a photo's coordinates to every viewer.
// visibleExifFields is the pure helper the panel now uses to drop the location row when the owner
// turned location off. PhotoDetail passes showLocation = isOwner || owner_prefs.showLocation !== false.

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? '',
  }),
}))
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...a: unknown[]) => a.filter(Boolean).join(' '),
    sp: () => '',
    flex: () => '',
  }),
}))

const { visibleExifFields } = await import('../components/ExifPanel.js')

describe('visibleExifFields', () => {
  it('includes the location row when showLocation is true', () => {
    const keys = visibleExifFields(true).map((f) => f.key)
    expect(keys).toContain('location')
    expect(keys).toContain('camera')
  })

  it('drops the location row when showLocation is false, keeping the other fields', () => {
    const keys = visibleExifFields(false).map((f) => f.key)
    expect(keys).not.toContain('location')
    expect(keys).toContain('camera')
    expect(keys).toContain('taken_at')
    // Only the one row is removed.
    expect(keys).toHaveLength(visibleExifFields(true).length - 1)
  })
})
