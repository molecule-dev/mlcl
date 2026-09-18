/**
 * Put one rendered page into the client shell (`index.html`): the markup into
 * `<div id="root">`, the title into `<title>` and the title metas, the
 * description into the description metas, and any extra `<head>` markup
 * before `</head>`.
 *
 * Shared by the build (scripts/prerender.mjs writes the result into `dist/`)
 * and the dev server (vite-static-site-plugin.ts serves it per request), so a
 * page is put together the same way on both — what hydrates in the preview is
 * what hydrates on the host.
 */

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * @param {string} shell - The client shell, with an empty `<div id="root"></div>`.
 * @param {{ html: string, title?: string, description?: string, head?: string }} page
 * @returns {string} The full document.
 */
export function injectPage(shell, page) {
  const rootTag = /<div id="root"><\/div>/
  if (!rootTag.test(shell)) {
    throw new Error('prerender: index.html has no empty <div id="root"></div> to fill')
  }
  let html = shell.replace(rootTag, () => `<div id="root">${page.html}</div>`)
  if (page.title) {
    const title = escapeText(page.title)
    html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${title}</title>`)
    for (const name of ['og:title', 'twitter:title']) {
      html = html.replace(
        new RegExp(`(<meta (?:property|name)="${name}" content=")[^"]*(")`),
        (_m, open, close) => `${open}${escapeAttr(page.title)}${close}`,
      )
    }
  }
  if (page.description) {
    for (const name of ['description', 'og:description', 'twitter:description']) {
      html = html.replace(
        new RegExp(`(<meta (?:property|name)="${name}" content=")[^"]*(")`),
        (_m, open, close) => `${open}${escapeAttr(page.description)}${close}`,
      )
    }
  }
  if (page.head) html = html.replace('</head>', () => `${page.head}\n  </head>`)
  return html
}
