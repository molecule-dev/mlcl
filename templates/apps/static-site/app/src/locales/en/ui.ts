/**
 * Default English translations for this site's own UI.
 *
 * Every key here is also the `defaultValue` at its call site, so a missing
 * key never breaks a page. Other locales live in sibling directories
 * (`../<code>/ui.ts`) and only need the keys they translate — the rest fall
 * back to English.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  // Navigation
  'nav.label': 'Site',
  'nav.posts': 'Posts',
  'nav.tags': 'Tags',
  'nav.about': 'About',
  'nav.feed': 'RSS',

  // Index
  'home.pageTitle': 'Page {{page}}',
  'home.tagline':
    'Short notes on building software, published as a static site from markdown files.',

  // Post
  'post.readingTime': '{{minutes}} min read',
  'post.tags': 'Tags',
  'post.markdown': 'View this post as markdown',

  // Pagination
  'pagination.label': 'Pages',
  'pagination.newer': 'Newer posts',
  'pagination.older': 'Older posts',
  'pagination.position': 'Page {{page}} of {{pages}}',

  // Tags
  'tags.title': 'Tags',
  'tags.description': 'Every tag on this site.',
  'tags.count': '({{count}})',
  'tag.title': 'Posts tagged {{tag}}',
  'tag.description': '{{count}} posts tagged {{tag}}.',

  // About
  'about.title': 'About {{appName}}',
  'about.description':
    'Short notes on building software, published as a static site from markdown files.',
  'about.visitWebsite': 'Visit our website',

  // Not found
  'notFound.title': 'Page not found',
  'notFound.home': 'Back to the front page',

  // Footer
  'footer.label': 'Site files',
  'footer.copyright': '© {{year}} {{appName}}',
  'footer.about': 'About {{appName}}',
  'footer.rss': 'RSS',
  'footer.atom': 'Atom',
  'footer.json': 'JSON',
  'footer.llms': 'llms.txt',
  'footer.sitemap': 'Sitemap',

  // Theme
  'theme.toggle': 'Toggle theme',
}
