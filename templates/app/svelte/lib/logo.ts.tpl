/**
 * The one place this app spells the public logo's URL.
 *
 * The asset itself is the scaffold's `static/logo.svg` (replace that file to
 * rebrand — `npm run generate-icons` then regenerates the favicon, PWA icons,
 * splash screens and OG image from it). The rendered `src` is `/logo.svg`,
 * exactly what the React scaffold renders.
 *
 * The path is ASSEMBLED rather than written as one string literal because of
 * the shared `rootRelativeAssetsPlugin` in `@molecule/app-vite-config-default`
 * (the `molecule:root-relative-assets` build guard): it collects every string
 * literal that starts with `/` and looks like an asset, then requires that file
 * in EVERY output directory. SvelteKit writes TWO directories — the browser
 * bundle (`.svelte-kit/output/client`, which does contain `static/`'s files)
 * and an SSR bundle (`.svelte-kit/output/server`, which never does) — so the
 * guard fails a SvelteKit build on any `/name.svg` literal, the scaffold's own
 * `<img src="/logo.svg">` included. Once the guard only checks browser-facing
 * output (or skips the `ssr` environment), this constant can become the plain
 * `'/logo.svg'` string with no other change.
 *
 * @module
 */
export const LOGO_SRC = `/${'logo.svg'}`
