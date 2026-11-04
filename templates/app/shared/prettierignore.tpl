dist/
node_modules/
*.md
coverage/
# Platform preview-bridge assets: byte-pinned to molecule-dev's canonical copies
# (a drift guard fails that build when they diverge) and stripped from production
# builds — not the project's own source, so the formatter leaves them alone.
/public/__mol/
/static/__mol/
