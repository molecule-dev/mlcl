import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Fleet footer contract: the © line renders via t() with the " — Built
  // with Molecule.dev" link appended as JSX in LandingFooter, so the en
  // override drops the "Built with…" sentence the shared common bundle
  // bakes into this key (it would render twice).
  'common.copyrightBuiltWithMolecule': '© {{year}} {{app}}',
}
