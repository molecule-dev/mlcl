import { getClassMap } from '@molecule/app-ui'

/**
 * AmbientOrbs — Vox signature backdrop.
 *
 * Two large blurred radial blobs (violet primary + cyan accent) that sit
 * behind page content to give the dark UI its characteristic depth.
 * Pointer-events-none so they never intercept clicks. Position the parent
 * `relative overflow-hidden` to clip them.
 */
export function AmbientOrbs() {
  const cm = getClassMap()
  return (
    <div
      aria-hidden="true"
      className={cm.cn(cm.position('absolute'), cm.inset0, 'pointer-events-none overflow-hidden')}
    >
      <div
        className={cm.cn(
          cm.position('absolute'),
          cm.roundedFull,
          'top-[-15%] left-[-10%] w-[36rem] h-[36rem] bg-primary/25 blur-[120px]',
        )}
      />
      <div
        className={cm.cn(
          cm.position('absolute'),
          cm.roundedFull,
          'bottom-[-15%] right-[-10%] w-[32rem] h-[32rem] bg-secondary/15 blur-[110px]',
        )}
      />
    </div>
  )
}
