dist/
node_modules/
*.md
coverage/
# Platform preview-bridge assets: byte-pinned to molecule-dev's canonical copies
# (a drift guard fails that build when they diverge) and stripped from production
# builds — not the project's own source, so the formatter leaves them alone.
/public/__mol/bridges/nav-bridge.js
/public/__mol/bridges/snapshot-bridge.js
/public/__mol/bridges/runtime-bridge.js
/public/__mol/bridges/interact-bridge.js
/public/__mol/bridges/preview-bridge.js
/static/__mol/bridges/nav-bridge.js
/static/__mol/bridges/snapshot-bridge.js
/static/__mol/bridges/runtime-bridge.js
/static/__mol/bridges/interact-bridge.js
/static/__mol/bridges/preview-bridge.js
