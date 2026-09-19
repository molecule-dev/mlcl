# One pinned dev dependency (eslint-plugin-jsx-a11y 6.x) lags the eslint 10
# release and still declares `peer eslint ^9`, so a default strict-peer
# `npm install` fails on resolution alone. Install with legacy peer
# resolution until eslint-plugin-jsx-a11y ships a version accepting eslint 10
# — then delete this line (and this file, if nothing else is added to it).
legacy-peer-deps=true
