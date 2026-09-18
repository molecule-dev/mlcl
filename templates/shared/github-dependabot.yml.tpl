# Dependabot — automated dependency vulnerability + version updates.
# Security updates (for advisories) are opened automatically and individually;
# the grouped routine updates below keep the dependency tree fresh without
# flooding you with one PR per package. npm workspaces (api/, app/) are covered
# from the root via the shared lockfile.
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
    groups:
      production-dependencies:
        dependency-type: 'production'
        update-types: ['minor', 'patch']
      development-dependencies:
        dependency-type: 'development'
        update-types: ['minor', 'patch']

  # Keep the GitHub Actions in .github/workflows pinned-but-current.
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
