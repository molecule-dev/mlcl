#!/usr/bin/env node
/**
 * Regenerate icons, splash screens, OG image, and HTML meta tags
 * from public/logo.svg + branding.ts.
 *
 * Usage: npm run generate-icons
 *
 * Edit public/logo.svg with your custom logo (32x32 viewBox recommended),
 * then run this script. It reads APP_NAME, APP_DESCRIPTION, and BRAND_COLOR
 * from branding.ts to regenerate all brand assets and HTML meta tags.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// --- Read source logo and extract inner SVG content ---
const logoSvg = readFileSync(join(root, 'public', 'logo.svg'), 'utf-8')
const innerMatch = logoSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
if (!innerMatch) {
  console.error('Error: Could not parse public/logo.svg — expected a valid SVG file.')
  process.exit(1)
}
const logoContent = innerMatch[1]

// Extract viewBox from source logo (supports custom logos with different viewBoxes)
const viewBoxMatch = logoSvg.match(/viewBox="([^"]*)"/)
const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 32 32'

// --- Read branding values (plain text regex — no TS runtime needed) ---
const brandingText = readFileSync(join(root, 'src/branding.ts'), 'utf-8')
function readConst(name, fallback) {
  const m = brandingText.match(new RegExp(`export const ${name}\\s*=\\s*'([^']*)'`))
  return m ? m[1] : fallback
}
const appName = readConst('APP_NAME', 'App')
const appDescription = readConst('APP_DESCRIPTION', '')
const brandColor = readConst('BRAND_COLOR', '#4070e0')

// --- Ensure output directories exist ---
mkdirSync(join(root, 'public', 'icons'), { recursive: true })

// --- Favicon (copy of logo.svg) ---
writeFileSync(join(root, 'public', 'favicon.svg'), logoSvg)

// --- PWA icons (white background, rounded corners, padded logo) ---
for (const size of [192, 512]) {
  const padding = Math.round(size * 0.15)
  const logoSize = size - padding * 2
  writeFileSync(
    join(root, 'public', 'icons', `icon-${size}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${padding}" fill="#ffffff"/>
  <svg x="${padding}" y="${padding}" width="${logoSize}" height="${logoSize}" viewBox="${viewBox}">
${logoContent}
  </svg>
</svg>
`,
  )
}

// --- Apple splash screens (white background, centered logo) ---
const splashSizes = [
  [2048, 2732],
  [1668, 2224],
  [1536, 2048],
  [1125, 2436],
  [1242, 2208],
  [750, 1334],
  [640, 1136],
]
for (const [w, h] of splashSizes) {
  const logoSize = Math.round(Math.min(w, h) * 0.25)
  const x = Math.round((w - logoSize) / 2)
  const y = Math.round((h - logoSize) / 2)
  writeFileSync(
    join(root, 'public', 'icons', `splash-${w}x${h}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <svg x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" viewBox="${viewBox}">
${logoContent}
  </svg>
</svg>
`,
  )
}

// --- OG image (social preview: logo + app name on light background) ---
writeFileSync(
  join(root, 'public', 'og-image.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f8f8f8"/>
  <svg x="500" y="115" width="200" height="200" viewBox="${viewBox}">
${logoContent}
  </svg>
  <text x="600" y="395" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui,sans-serif" font-weight="600" font-size="48" fill="#333333">${appName}</text>
  <text x="600" y="455" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui,sans-serif" font-weight="400" font-size="24" fill="#888888">${appDescription}</text>
</svg>
`,
)

// --- Update index.html meta tags ---
let html = readFileSync(join(root, 'index.html'), 'utf-8')
html = html.replace(/(<meta\s+name="theme-color"\s+content=")[^"]*(")/, `$1${brandColor}$2`)
html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${appDescription}$2`)
html = html.replace(
  /(<meta\s+name="apple-mobile-web-app-title"\s+content=")[^"]*(")/,
  `$1${appName}$2`,
)
html = html.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${appName}$2`)
html = html.replace(
  /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
  `$1${appDescription}$2`,
)
html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${appName}$2`)
html = html.replace(
  /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
  `$1${appDescription}$2`,
)
html = html.replace(/(<title>)[^<]*(<\/title>)/, `$1${appName}$2`)
writeFileSync(join(root, 'index.html'), html)

console.log('Generated 12 files from public/logo.svg + branding.ts:')
console.log('  public/favicon.svg')
console.log('  public/icons/icon-192.svg')
console.log('  public/icons/icon-512.svg')
for (const [w, h] of splashSizes) console.log(`  public/icons/splash-${w}x${h}.svg`)
console.log('  public/og-image.svg')
console.log('  index.html (meta tags)')
