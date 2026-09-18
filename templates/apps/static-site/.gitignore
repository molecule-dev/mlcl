node_modules/
dist/
.env*
!.env.example
*.log
.DS_Store
*.pem
coverage/

# Vendored @molecule/* package source — present in the dev sandbox at
# /workspace/molecule so @molecule/* imports resolve without npm. It is NOT part
# of the user's project (~20k files) and must never be committed; otherwise the
# commit bar lists the entire molecule tree.
molecule/

# In-container Meilisearch search index data (molecule.dev runs a per-project
# Meilisearch sidecar with --db-path ./.meilisearch)
.meilisearch/

# molecule.dev platform runtime markers written into the project root by the
# sandbox (.mol-install-*, .mol-boot-timeline.log, ...) — never project source
.mol-*
