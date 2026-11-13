/**
 * Solid JSX type additions for DOM attributes this app sets in their forced
 * attribute form (Solid's `attr:` namespace), which the shipped `solid-js`
 * types do not declare.
 *
 * `ExplicitAttributes` is Solid's documented augmentation point: each key
 * becomes an `attr:<key>` JSX attribute that Solid writes with
 * `setAttribute` — exactly what React's equivalent prop produces in the DOM.
 *
 * @module
 */

declare module 'solid-js/jsx-runtime' {
  namespace JSX {
    interface ExplicitAttributes {
      /** Forced attribute form of an SVG glyph's `focusable` flag. */
      focusable: string
    }
  }
}

export {}
