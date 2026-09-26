<!doctype html>
<html lang="en">
  <head>
    <meta name="generator" content="molecule.dev">
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0"
    />
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
    <!--
      mol:design-resources — every polished app uses Material Symbols Outlined
      icon glyphs via `<span class="material-symbols-outlined">name</span>` and
      Inter as the body font. Without these stylesheet links the icon `<span>`s
      render as literal text ("shield", "menu_open", "search", …) instead of
      glyphs. Per-app polish pipelines may REPLACE this entire block (see
      mlcl/templates/apps/<app>/app/index-design-resources.html); the defaults
      below are the safe fallback when no per-app override exists.
    -->
    <!-- mol:design-resources -->
    <link href="https://fonts.googleapis.com" rel="preconnect" />
    <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" rel="stylesheet" />
    <!-- /mol:design-resources -->
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
  </head>
  <body>
    {{ROOT_ELEMENT}}
    <!-- mol:preview-bridge:start -->
    <script>
      // Signal the parent IDE when the app renders, crashes, or recovers.
      // Used by PreviewPanel to manage the loading overlay.
      (function() {
        if (!window.parent || window.parent === window) return;
        var root = document.getElementById('root') || document.getElementById('app');
        if (!root) return;

        // --- Rate-limiting to prevent infinite loop freezes ---
        var transitions = [];        // timestamps of recent ready↔error transitions
        var WINDOW = 5000;           // 5s sliding window
        var MAX_TRANSITIONS = 12;    // max transitions in window before suppressing
        var suppressed = false;
        var errorCount = 0;          // runtime errors since last reset
        var MAX_ERRORS_PER_SEC = 20; // cap error messages per second
        var errorResetTimer = null;

        function post(type, msg, extra) {
          var data = { type: type };
          if (msg) data.message = msg;
          if (extra) for (var k in extra) data[k] = extra[k];
          window.parent.postMessage(data, '*');
        }

        function trackTransition() {
          var now = Date.now();
          transitions.push(now);
          // Trim old entries
          while (transitions.length > 0 && now - transitions[0] > WINDOW) transitions.shift();
          if (transitions.length >= MAX_TRANSITIONS && !suppressed) {
            suppressed = true;
            console.warn('[molecule:preview] Rapid ready/error cycle detected (' + transitions.length + ' in ' + WINDOW + 'ms) — suppressing messages to prevent freeze');
            // Auto-recover after the storm passes
            setTimeout(function() { suppressed = false; transitions = []; }, WINDOW);
          }
          return suppressed;
        }

        // Catch runtime errors and unhandled rejections.
        // Before render: show overlay via molecule:error.
        // After render: forward to IDE chat via molecule:runtime-error (for AI auto-fix).
        // Post-render crashes (empty #root) are detected by the MutationObserver below.
        window.addEventListener('error', function(e) {
          // Rate-limit error messages to prevent flood
          errorCount++;
          if (errorCount > MAX_ERRORS_PER_SEC) {
            if (errorCount === MAX_ERRORS_PER_SEC + 1) {
              console.warn('[molecule:preview] Error flood detected (' + errorCount + ' errors) — suppressing further error messages');
            }
            return;
          }
          if (!errorResetTimer) {
            errorResetTimer = setTimeout(function() { errorCount = 0; errorResetTimer = null; }, 1000);
          }
          if (!hadContent) {
            post('molecule:error', e.message || 'Runtime error', { source: e.filename || undefined, line: e.lineno || undefined, column: e.colno || undefined });
          } else {
            post('molecule:runtime-error', null, { message: String(e.message || 'Runtime error'), source: e.filename || undefined, line: e.lineno || undefined, column: e.colno || undefined });
          }
        });
        window.addEventListener('unhandledrejection', function(e) {
          errorCount++;
          if (errorCount > MAX_ERRORS_PER_SEC) return;
          if (!errorResetTimer) {
            errorResetTimer = setTimeout(function() { errorCount = 0; errorResetTimer = null; }, 1000);
          }
          var msg = e.reason?.message || (typeof e.reason === 'string' ? e.reason : 'Unhandled promise rejection');
          if (!hadContent) {
            var stack = e.reason?.stack || '';
            var srcMatch = stack.match(/(?:at\s+)?(?:\S+\s+)?\(?(\S+):(\d+):(\d+)\)?/);
            post('molecule:error', msg, { source: srcMatch ? srcMatch[1] : undefined, line: srcMatch ? parseInt(srcMatch[2], 10) : undefined, column: srcMatch ? parseInt(srcMatch[3], 10) : undefined });
          } else {
            post('molecule:runtime-error', null, { message: String(msg), source: 'unhandledrejection' });
          }
        });
        // Continuously watch #root — detect render, crash (empty), and recovery.
        // HMR updates don't trigger iframe onLoad, so this is the only way to
        // detect mid-session crashes from broken code written by the AI.
        var hadContent = false;
        var pendingCheck = false;
        new MutationObserver(function() {
          if (pendingCheck) return;
          pendingCheck = true;
          requestAnimationFrame(function() {
            pendingCheck = false;
            var hasContent = root.children.length > 0;
            if (hasContent && !hadContent) {
              hadContent = true;
              if (!trackTransition()) {
                post('molecule:ready');
                setTimeout(checkBlank, 2000);
              }
            } else if (!hasContent && hadContent) {
              hadContent = false;
              if (!trackTransition()) post('molecule:error', 'App crashed during update', { crash: true });
            }
          });
        }).observe(root, { childList: true });
        // Detect Vite error overlay — catches compilation errors that don't fire window.onerror
        new MutationObserver(function(mutations) {
          for (var i = 0; i < mutations.length; i++) {
            for (var j = 0; j < mutations[i].addedNodes.length; j++) {
              var node = mutations[i].addedNodes[j];
              if (node.tagName === 'VITE-ERROR-OVERLAY') {
                // Extract error from Shadow DOM after a tick (populates async)
                setTimeout(function() {
                  var sr = node.shadowRoot;
                  if (!sr) return;
                  var msgEl = sr.querySelector('.message-body') || sr.querySelector('.message');
                  var fileEl = sr.querySelector('.file');
                  var frameEl = sr.querySelector('.frame');
                  var message = (msgEl ? msgEl.textContent : '') || 'Vite compilation error';
                  var file = fileEl ? fileEl.textContent : '';
                  var frame = frameEl ? frameEl.textContent : '';
                  post('molecule:runtime-error', null, {
                    message: message.trim() + (file ? ' in ' + file.trim() : ''),
                    source: file ? file.trim() : 'vite',
                    detail: frame ? frame.trim() : undefined
                  });
                }, 100);
              }
            }
          }
        }).observe(document.documentElement, { childList: true });
        // Heartbeat — lets parent distinguish alive-but-broken from dead
        setInterval(function() { post('molecule:heartbeat'); }, 3000);
        // --- Browser console capture → /__molecule_log ---
        // Mirror console.* + uncaught errors to a buffer and POST batches to the
        // dev server, whose middleware appends them to /tmp/browser.log so the IDE
        // AI can read the live app's console via its read_logs tool. Only runs when
        // embedded (this IIFE already returns early when not in the IDE); in a
        // production build there's no middleware, so the POST simply 404s + is
        // swallowed.
        (function() {
          var buf = [];                 // pending entries
          var MAX_BUF = 200;            // cap memory if the app spams logs
          function ser(a) {
            try {
              if (a instanceof Error) return a.stack || (a.name + ': ' + a.message);
              if (typeof a === 'string') return a;
              if (typeof a === 'object') return JSON.stringify(a);
              return String(a);
            } catch (e) { return String(a); }
          }
          function rec(level, parts) {
            if (buf.length < MAX_BUF) buf.push({ l: level, m: parts.join(' ').slice(0, 2000), t: Date.now() });
          }
          ['log', 'info', 'warn', 'error', 'debug'].forEach(function(level) {
            var orig = console[level] ? console[level].bind(console) : function() {};
            console[level] = function() {
              orig.apply(null, arguments);
              try {
                var parts = [];
                for (var i = 0; i < arguments.length; i++) parts.push(ser(arguments[i]));
                rec(level, parts);
              } catch (e) {}
            };
          });
          window.addEventListener('error', function(e) {
            rec('error', ['Uncaught: ' + (e.message || 'error') + (e.filename ? ' (' + e.filename + ':' + e.lineno + ')' : '')]);
          });
          window.addEventListener('unhandledrejection', function(e) {
            var m = (e.reason && e.reason.message) || (typeof e.reason === 'string' ? e.reason : 'Unhandled rejection');
            rec('error', ['Unhandled rejection: ' + m]);
          });
          var sending = false;
          function flush() {
            if (sending || !buf.length) return;
            sending = true;
            var batch = buf.splice(0, buf.length);
            try {
              fetch('/__molecule_log', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(batch),
                keepalive: true
              }).catch(function() {}).finally(function() { sending = false; });
            } catch (e) { sending = false; }
          }
          setInterval(flush, 1000);
          window.addEventListener('beforeunload', flush);
        })();
        // Blank page detection — fires after render if page has no visible content
        function checkBlank() {
          if (!root.children.length) return;
          var text = root.innerText || '';
          var rect = root.getBoundingClientRect();
          if (text.trim().length === 0 && rect.height < 10) {
            post('molecule:blank', 'Page rendered but appears blank (no visible text content)');
          }
        }
        // Check initial state
        if (root.children.length > 0) {
          hadContent = true;
          post('molecule:ready');
          setTimeout(checkBlank, 2000);
        }
        // Detect 5XX network errors from fetch and XMLHttpRequest.
        // Debounced and deduplicated — reports each failing URL at most once per 10s.
        var recentNetErrors = {};  // url → timestamp
        var netErrorBatch = [];
        var netErrorTimer = null;
        var NET_ERROR_DEDUP_MS = 10000;
        var NET_ERROR_DEBOUNCE_MS = 2000;
        var MAX_NET_ERRORS_PER_BATCH = 5;
        function reportNetError(status, url, method) {
          var now = Date.now();
          // Strip query string for dedup key
          var key = (method || 'GET') + ' ' + url.replace(/\?.*$/, '');
          if (recentNetErrors[key] && now - recentNetErrors[key] < NET_ERROR_DEDUP_MS) return;
          recentNetErrors[key] = now;
          if (netErrorBatch.length < MAX_NET_ERRORS_PER_BATCH) {
            // Strip origin to get a readable path
            var path = url;
            try { path = new URL(url).pathname; } catch(e) {}
            netErrorBatch.push({ status: status, method: method || 'GET', path: path });
          }
          if (netErrorTimer) clearTimeout(netErrorTimer);
          netErrorTimer = setTimeout(function() {
            if (netErrorBatch.length > 0) {
              var lines = netErrorBatch.map(function(e) {
                return e.method + ' ' + e.path + ' → ' + e.status;
              });
              post('molecule:runtime-error', null, {
                message: 'Server returned error responses:\n' + lines.join('\n'),
                source: 'network'
              });
              netErrorBatch = [];
            }
            netErrorTimer = null;
          }, NET_ERROR_DEBOUNCE_MS);
        }
        // Intercept fetch
        var origFetch = window.fetch;
        window.fetch = function() {
          var url = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0]?.url || '');
          var method = arguments[1]?.method || 'GET';
          return origFetch.apply(this, arguments).then(function(response) {
            if (response.status >= 500) reportNetError(response.status, url, method);
            return response;
          });
        };
        // Intercept XMLHttpRequest
        var origXHROpen = XMLHttpRequest.prototype.open;
        var origXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url) {
          this._molMethod = method;
          this._molUrl = url;
          return origXHROpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function() {
          var xhr = this;
          xhr.addEventListener('load', function() {
            if (xhr.status >= 500) reportNetError(xhr.status, xhr._molUrl || '', xhr._molMethod || 'GET');
          });
          return origXHRSend.apply(this, arguments);
        };
      })();
    </script>
    <!-- mol:preview-bridge:end -->
    <script type="module" src="{{MAIN_ENTRY}}"></script>
    <!--
      The bidirectional preview-nav bridge (molecule:navigate sender for the URL
      bar PV2 + molecule:nav-command receiver for Back/Forward PV3) is appended
      right before </body> at scaffold time by injectPreviewNavBridge() in
      mlcl/src/lib/scaffold.ts — one source that reaches custom builds AND all
      flagship templates, so it is intentionally NOT hardcoded here.
    -->
  </body>
</html>
