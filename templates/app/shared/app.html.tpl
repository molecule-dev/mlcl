<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0" />
    <meta name="theme-color" content="{{BRAND_COLOR}}" />
    <meta name="description" content="{{APP_DESCRIPTION}}" />
    <meta name="color-scheme" content="light dark" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="{{PROJECT_NAME}}" />
    <meta name="format-detection" content="telephone=no" />
    <meta name="msapplication-tap-highlight" content="no" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{{PROJECT_NAME}}" />
    <meta property="og:description" content="{{APP_DESCRIPTION}}" />
    <meta property="og:image" content="/og-image.svg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{{PROJECT_NAME}}" />
    <meta name="twitter:description" content="{{APP_DESCRIPTION}}" />
    <meta name="twitter:image" content="/og-image.svg" />
{{FONT_LINKS}}
    <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
    <link rel="apple-touch-startup-image" href="/icons/splash-2048x2732.svg" sizes="2048x2732" />
    <link rel="apple-touch-startup-image" href="/icons/splash-1668x2224.svg" sizes="1668x2224" />
    <link rel="apple-touch-startup-image" href="/icons/splash-1536x2048.svg" sizes="1536x2048" />
    <link rel="apple-touch-startup-image" href="/icons/splash-1125x2436.svg" sizes="1125x2436" />
    <link rel="apple-touch-startup-image" href="/icons/splash-1242x2208.svg" sizes="1242x2208" />
    <link rel="apple-touch-startup-image" href="/icons/splash-750x1334.svg" sizes="750x1334" />
    <link rel="apple-touch-startup-image" href="/icons/splash-640x1136.svg" sizes="640x1136" />
    <title>{{PROJECT_NAME}}</title>
    %sveltekit.head%
  </head>
  <body>
    <div id="root">%sveltekit.body%</div>
    <!--
      The bidirectional preview-nav bridge (molecule:navigate sender for the URL
      bar PV2 + molecule:nav-command receiver for Back/Forward PV3) is appended
      right before </body> at scaffold time by injectPreviewNavBridge() in
      mlcl/src/lib/scaffold.ts — one source that reaches every scaffolded app.
    -->
  </body>
</html>
