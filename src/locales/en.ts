/**
 * English locale for the mlcl CLI.
 *
 * Keys follow the convention:
 *   commands.{cmd}.{category}.{key}
 *   lib.{module}.{category}.{key}
 *
 * Interpolation: {param} placeholders replaced at runtime.
 * Pluralization: _one / _other suffixes for count-based forms.
 *
 * @module
 */

import type { LocaleMessages } from './types.js'

export const messages: LocaleMessages = {
  // ─── commands/add ───────────────────────────────────────────────
  'commands.add.description': 'Add a molecule package to your project',
  'commands.add.flags.noInstall': 'Skip npm install',
  'commands.add.flags.dev': 'Add as dev dependency',
  'commands.add.flags.inject':
    'Run mlcl inject immediately after adding (installs + wires the package)',
  'commands.add.args.molecule': 'Molecule package name',
  'commands.add.labels.intro': 'mlcl add',
  'commands.add.errors.noPackageJson':
    'No package.json found in {dir}. Run mlcl add from your project root (or its api/ or app/ subdirectory).',
  'commands.add.warnings.versionFromRegistry':
    'Could not resolve {name} from npm — pinned {version} from the local molecule registry. Adjust the version in package.json if you target a different release.',
  'commands.add.warnings.versionFallback':
    'Could not resolve {name} from npm — using "{version}". Set an exact version in package.json before publishing.',
  'commands.add.warnings.namingConvention':
    'Package "{name}" doesn\'t follow @molecule/* naming convention',
  'commands.add.spinners.adding': 'Adding {name}...',
  'commands.add.spinners.addedTo': 'Added {name} to {depKey}',
  'commands.add.spinners.installing': 'Installing dependencies...',
  'commands.add.spinners.installed': 'Dependencies installed',
  'commands.add.spinners.installFailed': 'Installation failed',
  'commands.add.spinners.addFailed': 'Failed to add molecule',
  'commands.add.messages.installNote':
    'Note: Run npm install manually to complete the installation',
  'commands.add.messages.success': '{name} added successfully!',
  'commands.add.messages.nextSteps': 'Next steps:',
  'commands.add.messages.stepInstall': '1. Run {command}',
  'commands.add.messages.stepInject': '{num}. Run {command} to apply the molecule',

  // ─── commands/create ────────────────────────────────────────────
  'commands.create.description': 'Create a new project',
  'commands.create.flags.skipInstall': 'Skip npm install',
  'commands.create.flags.type': 'Project type (api, app, or full-stack)',
  'commands.create.flags.framework': 'Frontend framework (app only)',
  'commands.create.flags.packages': 'Comma-separated list of @molecule package names to include',
  'commands.create.flags.theme': 'Theme preset name (e.g. liquid-glass)',
  'commands.create.flags.force':
    'Scaffold into a directory that already holds a project (existing files are overwritten)',
  'commands.create.errors.projectExists':
    '{path} already holds a project (found {found}). Creating here would overwrite your code and .env. Pick another name, or pass --force if you mean to overwrite it.',
  'commands.add.errors.workspaceUnknown':
    'This is a full-stack project root, and {name} is not an api or app package, so it is unclear which of api/ and app/ it belongs in. Run the command from inside that folder.',
  'commands.add.errors.notFound':
    '{name} was not found on npm or in the molecule registry, so nothing was added. Check the spelling (`mlcl search <words>` lists real packages).',
  'commands.add.errors.installFailed':
    'The package was added to package.json, but `npm install` failed. Fix the error above and run `npm install`.',
  'commands.create.flags.noInteractive':
    'Run without interactive prompts (requires --type and name arg)',
  'commands.create.args.name': 'Project name',
  'commands.create.labels.intro': 'mlcl create',
  'commands.create.errors.nameRequired': 'Project name is required in non-interactive mode',
  'commands.create.errors.nameInvalid':
    'Invalid project name "{name}" — path segments may not be "..", and the final directory must use lowercase letters, numbers, and hyphens only',
  'commands.create.errors.templateInvalid':
    'Invalid template slug "{template}" — expected a plain slug (letters, numbers, underscores, hyphens)',
  'commands.create.errors.typeRequired': '--type is required in non-interactive mode',
  'commands.create.errors.frameworkRequired':
    '--framework is required for app/full-stack projects in non-interactive mode',
  'commands.create.prompts.projectName': 'What is your project name?',
  'commands.create.prompts.projectNamePlaceholder': 'my-awesome-app',
  'commands.create.prompts.nameRequired': 'Name is required',
  'commands.create.prompts.nameFormat': 'Use lowercase letters, numbers, and hyphens only',
  'commands.create.prompts.cancelled': 'Setup cancelled',
  'commands.create.prompts.projectType': 'Project type:',
  'commands.create.prompts.projectTypeApi': 'API',
  'commands.create.prompts.projectTypeApiHint': 'Express backend',
  'commands.create.prompts.projectTypeApp': 'App',
  'commands.create.prompts.projectTypeAppHint': 'Frontend application',
  'commands.create.prompts.projectTypeFullStack': 'Full-Stack',
  'commands.create.prompts.projectTypeFullStackHint': 'API + App monorepo',
  'commands.create.prompts.projectTypeStatic': 'Static site',
  'commands.create.prompts.projectTypeStaticHint':
    'Prerendered React site — no API, no database; deploy dist/ anywhere',
  'commands.create.errors.staticFrameworkReact':
    'static projects support --framework react only (the prerender renders with react-dom/server)',
  'commands.create.prompts.projectTypeStatusPage': 'Status Page',
  'commands.create.prompts.projectTypeStatusPageHint': 'Full-stack uptime monitoring dashboard',
  'commands.create.prompts.projectTypeStatusPageEdge': 'Status Page (Edge)',
  'commands.create.prompts.projectTypeStatusPageEdgeHint': 'Cloudflare Workers status page',
  'commands.create.prompts.framework': 'Framework:',
  'commands.create.prompts.features': 'What features do you need?',
  'commands.create.prompts.selectProviders': '{label} providers:',
  'commands.create.prompts.selectProvider': '{label} provider:',
  'commands.create.spinners.creating': 'Creating project...',
  'commands.create.spinners.created': 'Project created',
  'commands.create.spinners.addingPackages': 'Adding molecule packages...',
  'commands.create.spinners.addedFullStack': 'Added {apiCount} API + {appCount} App packages',
  'commands.create.spinners.addedPackages': 'Added {count} packages',
  'commands.create.spinners.installing': 'Installing dependencies...',
  'commands.create.spinners.installed': 'Dependencies installed',
  'commands.create.spinners.installFailed': 'npm install failed - run it manually',
  'commands.create.spinners.injecting': 'Generating {workspace} integration code...',
  'commands.create.spinners.injected': '{workspace} integration code generated',
  'commands.create.spinners.injectSkipped':
    '{workspace} injection skipped - run mlcl inject after installing',
  'commands.create.spinners.injectingSingle': 'Generating integration code...',
  'commands.create.spinners.injectedSingle': 'Integration code generated',
  'commands.create.spinners.injectSkippedSingle':
    'Injection skipped - run mlcl inject after installing',
  'commands.create.spinners.reinstalling': 'Reinstalling with resolved paths...',
  'commands.create.spinners.reinstalled': 'Dependencies reinstalled',
  'commands.create.spinners.reinstallFailed': 'Reinstall failed - run npm install manually',
  'commands.create.spinners.formatting': 'Formatting generated code...',
  'commands.create.spinners.formatted': 'Code formatted',
  'commands.create.spinners.formattingSkipped': 'Formatting skipped - run npm run format manually',
  'commands.create.spinners.testing': 'Running smoke tests...',
  'commands.create.spinners.testsPassed': 'Smoke tests passed{summary}',
  'commands.create.spinners.testsFailed': 'Smoke tests failed - run npm test to investigate',
  'commands.create.messages.success': 'Project created!',
  'commands.create.messages.createdProject': 'Created {type} project: {name}',
  'commands.create.messages.monorepoDetected':
    'Detected monorepo at {root} \u2014 using file: paths for {count} packages',
  'commands.create.messages.resolvedPaths': 'Resolved monorepo file: paths',
  'commands.create.messages.reinstallingLog': 'Reinstalling with resolved file: paths...',
  'commands.create.messages.envGenFullStack': 'Generated .env files for api and app',
  'commands.create.messages.envGenSingle': 'Generated .env file',
  'commands.create.messages.sqlCopied': 'Copied SQL setup scripts',
  'commands.create.messages.fontsCopied': 'Copied font files to public/fonts/',
  'commands.create.messages.envVars': 'Required environment variables:',
  'commands.create.messages.nextSteps': 'Next steps:',
  'commands.create.messages.editEnvFullStack': '# Edit api/.env and app/.env with your credentials',
  'commands.create.messages.editEnv': '# Edit .env with your credentials',
  'commands.create.messages.generateJwt':
    '# Generate JWT keys: openssl genrsa -out jwt-private.pem 2048 && openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem',
  'commands.create.messages.projectPath': 'Project path: {path}',
  'commands.create.messages.packagesList': 'Packages: {packages}',

  // ─── commands/init ──────────────────────────────────────────────
  'commands.init.description': 'Initialize a new molecule package',
  'commands.init.flags.name': 'Package name (without @molecule/ prefix)',
  'commands.init.flags.type': 'Package type',
  'commands.init.flags.category': 'Feature category (e.g., database, payments, email, cache, ai)',
  'commands.init.flags.description': 'Package description',
  'commands.init.flags.stack': 'Stack: api (backend) or app (frontend)',
  'commands.init.flags.implements':
    'Core interface this provider implements (e.g., @molecule/api-cache)',
  'commands.init.flags.label': 'Human-readable label for UI',
  'commands.init.flags.interactive': 'Interactive mode (default: true)',
  'commands.init.flags.force': 'Overwrite existing files',
  'commands.init.flags.dir': 'Target directory (default: cwd)',
  'commands.init.labels.intro': 'mlcl init',
  'commands.init.prompts.describe': 'Describe what you want to build:',
  'commands.init.prompts.describePlaceholder': 'e.g., A Redis-backed cache provider',
  'commands.init.prompts.describeValidation': 'Please provide a description',
  'commands.init.prompts.cancelled': 'Operation cancelled',
  'commands.init.prompts.overwrite': 'Directory {name} already exists. Overwrite?',
  'commands.init.prompts.confirm': 'Create this package?',
  'commands.init.labels.inferredMetadata': 'Inferred metadata',
  'commands.init.labels.name': 'Name:',
  'commands.init.labels.type': 'Type:',
  'commands.init.labels.category': 'Category:',
  'commands.init.labels.stack': 'Stack:',
  'commands.init.labels.label': 'Label:',
  'commands.init.labels.implements': 'Implements:',
  'commands.init.labels.secrets': 'Secrets:',
  'commands.init.labels.tables': 'Tables:',
  'commands.init.errors.dirExists': 'Directory already exists: {path}. Use --force to overwrite.',
  'commands.init.errors.nameRequired': '--name is required in non-interactive mode',
  'commands.init.spinners.creating': 'Creating package structure...',
  'commands.init.spinners.created': 'Package structure created',
  'commands.init.messages.success': 'Created @molecule/{name}',
  'commands.init.labels.directory': 'Directory:',
  'commands.init.labels.filesCreated': 'Files created:',
  'commands.init.messages.nextSteps': 'Next steps:',
  'commands.init.messages.implementPackage': 'Implement your package in {path}',

  // ─── commands/inject ────────────────────────────────────────────
  'commands.inject.description': 'Execute molecule injection with preview',
  'commands.inject.flags.dryRun': 'Show what would be done without making changes',
  'commands.inject.flags.force': 'Overwrite existing files and skip confirmation prompts',
  'commands.inject.flags.molecule': 'Specific molecule to inject',
  'commands.inject.flags.path': 'Path to the project',
  'commands.inject.flags.install': 'Run npm install after injection',
  'commands.inject.flags.test': 'Run smoke tests after injection',
  'commands.inject.labels.intro': 'mlcl inject',
  'commands.inject.spinners.finding': 'Finding molecules...',
  'commands.inject.spinners.found': 'Found {count} molecule(s)',
  'commands.inject.messages.noMolecules': 'No molecules to inject',
  'commands.inject.messages.addHint': 'Add a molecule with: {command}',
  'commands.inject.spinners.planning': 'Planning injection...',
  'commands.inject.spinners.planned': 'Injection planned',
  'commands.inject.labels.injectionPlan': 'Injection Plan:',
  'commands.inject.labels.type': 'Type: {type}',
  'commands.inject.labels.files': 'Files:',
  'commands.inject.labels.dependencies': 'Dependencies:',
  'commands.inject.labels.migrations': 'Migrations:',
  'commands.inject.labels.routes': 'Routes:',
  'commands.inject.labels.bondSetup': 'Bond Setup:',
  'commands.inject.labels.conflicts': 'Conflicts:',
  'commands.inject.labels.generatedFiles': 'Generated project files',
  'commands.inject.messages.conflictsFound': 'Found {count} conflict(s). Use --force to overwrite.',
  'commands.inject.messages.dryRunComplete': 'Dry run complete - no changes made',
  'commands.inject.prompts.proceed': 'Proceed with injection?',
  'commands.inject.messages.nonInteractiveProceed':
    'Non-interactive stdin — proceeding with injection (pass --force to also overwrite conflicts)',
  'commands.inject.prompts.cancelled': 'Operation cancelled',
  'commands.inject.spinners.executing': 'Executing injection...',
  'commands.inject.spinners.complete': 'Injection complete',
  'commands.inject.labels.envCreated': 'Created .env with required environment variables:',
  'commands.inject.labels.envUpdated': 'Appended missing environment variables to .env:',
  'commands.inject.labels.envDryRun': 'Would append to .env:',
  'commands.inject.messages.envGenerated': 'auto-generated — no setup needed',
  'commands.inject.messages.envNeedsSetup': 'needs setup — see the comments in .env',
  'commands.inject.messages.envAlreadyPresent': 'Already present (untouched): {keys}',
  'commands.inject.spinners.syncing': 'Syncing project assets...',
  'commands.inject.spinners.synced': 'Assets synced',
  'commands.inject.spinners.syncSkipped': 'Asset sync skipped',
  'commands.inject.spinners.validating': 'Validating output...',
  'commands.inject.spinners.validated': 'Validation passed',
  'commands.inject.spinners.validationIssues': 'Validation found issues',
  'commands.inject.spinners.formatting': 'Formatting generated code...',
  'commands.inject.spinners.formatted': 'Code formatted',
  'commands.inject.spinners.formattingSkipped': 'Formatting skipped (prettier not installed)',
  'commands.inject.spinners.testing': 'Running smoke tests...',
  'commands.inject.spinners.testsPassed': 'Smoke tests passed ({summary})',
  'commands.inject.spinners.testsFailed': 'Smoke tests failed',
  'commands.inject.labels.warnings': 'Warnings:',
  'commands.inject.labels.errors': 'Errors:',
  'commands.inject.messages.summary': 'Created {created} files, modified {modified} files',
  'commands.inject.messages.nextSteps': 'Next steps:',
  'commands.inject.messages.runInstall': '{num}. Run {command} to install new dependencies',
  'commands.inject.messages.runBuild': '{num}. Run {command} to verify the build',
  'commands.inject.messages.runTest': '{num}. Run {command} to run tests',

  // ─── commands/swap ──────────────────────────────────────────────
  'commands.swap.description':
    'Swap a molecule provider for another implementing the same interface',
  'commands.swap.args.molecule': 'New molecule provider to swap in',
  'commands.swap.flags.replace': 'Specific provider to replace (for multi-provider categories)',
  'commands.swap.flags.noInteractive': 'Skip confirmation prompt',
  'commands.swap.flags.install': 'Run npm install after swap',
  'commands.swap.flags.format': 'Run prettier after swap',
  'commands.swap.labels.intro': 'mlcl swap',
  'commands.swap.errors.mustBeMolecule': 'Package name must start with @molecule/',
  'commands.swap.spinners.resolving': 'Resolving new provider...',
  'commands.swap.errors.notFound': 'Package {name} not found in registry',
  'commands.swap.errors.cannotResolve':
    'Cannot resolve package. Ensure the molecule packages directory is accessible.',
  'commands.swap.errors.notProvider': '{name} is not a provider',
  'commands.swap.errors.notProviderDetail':
    'Package must have molecule.type "provider" and molecule.implements.',
  'commands.swap.spinners.resolved': 'Resolved {name} \u2192 implements {interface}',
  'commands.swap.errors.noProjectDir':
    'No {stack}/ directory found. Run this from a molecule project root.',
  'commands.swap.spinners.findingExisting': 'Finding existing provider...',
  'commands.swap.errors.replaceNotFound': '{name} not found in registry',
  'commands.swap.errors.replaceNotFoundDetail': 'Specified --replace package not found.',
  'commands.swap.errors.noExistingProvider': 'No existing provider for {interface}',
  'commands.swap.errors.noExistingProviderDetail':
    'No existing provider found for this interface. Use "mlcl inject" to add one instead.',
  'commands.swap.errors.multipleProviders': 'Multiple providers for {interface}',
  'commands.swap.labels.multipleProvidersNote': 'Found multiple providers',
  'commands.swap.errors.multipleProvidersDetail':
    'Use --replace to specify which provider to swap out.',
  'commands.swap.prompts.whichToReplace': 'Which provider should be replaced?',
  'commands.swap.messages.migrateRunnerUpdated': 'Updated {file} for the new database',
  'commands.swap.messages.convertMigrations':
    'Your migrations/ files are written for the previous database: convert them to the new dialect, point DATABASE_URL at the new database, and move any data you want to keep.',
  'commands.swap.errors.alreadyInstalled': '{name} is already installed',
  'commands.swap.errors.alreadyInstalledDetail': 'New provider is the same as the existing one.',
  'commands.swap.spinners.foundExisting': 'Found {old} \u2192 swapping to {new}',
  'commands.swap.labels.swapPreview': 'Swap preview',
  'commands.swap.labels.interface': 'Interface:',
  'commands.swap.labels.remove': '- Remove:',
  'commands.swap.labels.add': '+ Add:',
  'commands.swap.labels.files': 'Files:',
  'commands.swap.labels.envPreview': 'Env vars to append (.env):',
  'commands.swap.labels.envCreated': "Created .env with the new provider's environment variables:",
  'commands.swap.labels.envUpdated': "Appended the new provider's environment variables to .env:",
  'commands.swap.messages.envGenerated': 'auto-generated — no setup needed',
  'commands.swap.messages.envNeedsSetup': 'needs setup — see the comments in .env',
  'commands.swap.messages.envAlreadyPresent': 'Already present (untouched): {keys}',
  'commands.swap.prompts.proceed': 'Proceed with swap?',
  'commands.swap.prompts.cancelled': 'Swap cancelled.',
  'commands.swap.spinners.swapping': 'Swapping provider...',
  'commands.swap.spinners.swapped': 'Provider swapped',
  'commands.swap.spinners.swapFailed': 'Swap aborted — project left unchanged',
  'commands.swap.spinners.installing': 'Installing dependencies...',
  'commands.swap.spinners.installed': 'Dependencies installed',
  'commands.swap.spinners.installFailed': 'npm install failed \u2014 run it manually',
  'commands.swap.spinners.syncing': 'Syncing project assets...',
  'commands.swap.spinners.synced': 'Assets synced',
  'commands.swap.spinners.syncSkipped': 'Asset sync skipped',
  'commands.swap.messages.success': 'Swapped {old} \u2192 {new}',
  'commands.swap.errors.indexMissing':
    'No bonds barrel found at {file}. Cannot rewire the swap \u2014 nothing was changed.',
  'commands.swap.errors.indexNoMatch':
    'Could not find the existing wiring (import of {symbol} from the {bond} bond) in {file}. The index format was not recognized, so nothing was changed (the old bond file was NOT deleted). Rewire it manually, or re-run from a project whose bonds/index.ts uses the generated format.',
  'commands.swap.errors.writeFailed':
    'Swap failed while writing files and was rolled back \u2014 the project is unchanged: {error}',
  'commands.swap.errors.swapFailedDetail': 'Swap could not be applied: {error}',
  'commands.swap.warnings.setupCallNotWired':
    'Rewired the import in {file}, but could not find the provider\u2019s setup call to update \u2014 add the new setup call manually so the provider is initialized.',

  // ─── commands/validate ──────────────────────────────────────────
  'commands.validate.description': 'Validate a molecule package structure and conventions',
  'commands.validate.flags.path': 'Path to the molecule package',
  'commands.validate.flags.json': 'Output results as JSON',
  'commands.validate.labels.intro': 'mlcl validate',
  'commands.validate.spinners.validating': 'Validating molecule...',
  'commands.validate.spinners.complete': 'Validation complete',
  'commands.validate.spinners.failed': 'Validation failed',
  'commands.validate.errors.missingPackageJson': 'Missing package.json',
  'commands.validate.errors.missingSrcDir': 'Missing src/ directory',
  'commands.validate.errors.missingEntryPoint': 'Missing src/index.ts entry point',
  'commands.validate.warnings.missingTsconfig': 'Missing tsconfig.json (TypeScript recommended)',
  'commands.validate.info.noMoleculeMd':
    'No README.md - consider adding for edge case documentation',
  'commands.validate.errors.invalidName': 'Package name should start with @molecule/, got: {name}',
  'commands.validate.warnings.missingPrefix': 'Package name should use api- or app- prefix: {name}',
  'commands.validate.warnings.noExports': 'No exports found in src/index.ts',
  'commands.validate.info.noTables': 'Resource has no SQL tables in __setup__/',
  'commands.validate.info.noRoutes': 'No routes detected - consider adding @route comments',
  'commands.validate.info.bondNoPeerDep': 'Bond should have a core interface as peer dependency',
  'commands.validate.labels.package': 'Package: {name}@{version}',
  'commands.validate.labels.type': 'Type: {type}',
  'commands.validate.labels.exports': 'Exports:',
  'commands.validate.labels.andMore': '... and {count} more',
  'commands.validate.labels.tables': 'Database Tables:',
  'commands.validate.labels.routes': 'Routes:',
  'commands.validate.labels.issues': 'Issues:',
  'commands.validate.messages.valid': 'Molecule is valid',
  'commands.validate.messages.errorSummary': '{errors} error(s), {warnings} warning(s)',
  'commands.validate.messages.warningSummary': 'Valid with {warnings} warning(s), {infos} info(s)',

  // ─── lib/validator ──────────────────────────────────────────────
  'lib.validator.errors.missingCriticalFile': 'Missing critical file: {file}',
  'lib.validator.errors.routerImportMissing': 'Router imports non-existent file: {path}',
  'lib.validator.errors.duplicateRoute': 'Duplicate route: {route}',
  'lib.validator.warnings.unknownHandlerMap': 'Router references unknown handler map: {name}',
  'lib.validator.warnings.routeCount': 'Router has {count} route(s) defined',
  'lib.validator.errors.duplicateImport': 'Duplicate import in bonds/index.ts: {path}',
  'lib.validator.errors.duplicateExport': 'Duplicate export in bonds/index.ts: {path}',
  'lib.validator.errors.bondFileMissing': 'Bond file missing: {path}',
  'lib.validator.warnings.setupNotCalled': 'Bond setup function imported but never called: {name}',
  'lib.validator.errors.serverImportMissing': 'Server imports non-existent file: {path}',
  'lib.validator.errors.serverMissingBonds': 'Server missing setupBonds() call',
  'lib.validator.errors.serverMissingRouter': 'Server missing router import/usage',
  'lib.validator.errors.serverMissingExpress': 'Server missing express import',
  'lib.validator.warnings.serverMissingHealth': 'Server missing health check endpoint',
  'lib.validator.warnings.serverMissingErrorHandler': 'Server missing error handling middleware',
  'lib.validator.warnings.resourceMissingWrapper': 'Resource {name} missing index.ts wrapper',
  'lib.validator.errors.resourceMissingHandlerMap':
    'Resource {name}/index.ts missing requestHandlerMap export',

  // ─── lib/injector ───────────────────────────────────────────────
  'lib.injector.errors.packageNotFound':
    "Could not find molecule package. Run 'npm install {name}' first.",
  'lib.injector.errors.scanFailed': 'Failed to scan molecule package: {error}',
  'lib.injector.errors.migrationExists': "Migration for table '{table}' already exists",
  'lib.injector.errors.migrationDuplicateOther':
    "Migration for table '{table}' was already planned for {name} in this run — the two packages ship the same setup SQL, so only one file is written",
  'lib.injector.errors.migrationDuplicateSelf':
    "{name} declares table '{table}' twice in its own setup metadata — only one migration is written",
  'lib.injector.errors.migrationTableConflict':
    "table '{table}' is declared by both {first} and {second} with DIFFERENT SQL — two migrations for one table were refused; reconcile the two packages' setup SQL",
  'lib.injector.descriptions.createBond': 'Create bond setup for {name}',
  'lib.injector.descriptions.addBondExport': 'Add {name} export to bonds index',
  'lib.injector.descriptions.createMiddleware': 'Create middleware setup for {name}',
  'lib.injector.warnings.skippedConflict': 'Skipped {path} due to conflict',
  'lib.injector.warnings.npmInstallFailed': 'Failed to run npm install: {error}. Run it manually.',
  'lib.injector.errors.injectionFailed': 'Injection failed: {error}',
  'lib.injector.errors.fileExists': 'File already exists: {path}',

  // ─── commands/token ─────────────────────────────────────────────
  'commands.token.create.description':
    'Create a personal API token for CI and scripts. The token is printed once, by itself, on stdout.',
  'commands.token.create.args.name': 'A name for the token, 1 to 60 characters (e.g. ci)',
  'commands.token.create.flags.expiresInDays': 'Days until the token expires, 1 to 365',
  'commands.token.create.created': 'Created token "{name}". It expires on {expires}.',
  'commands.token.create.shownOnce':
    'This is the only time the token is shown. Store it somewhere safe.',
  'commands.token.create.useIt':
    'Use it: export MOLECULE_TOKEN=<token>  (or send the header Authorization: Bearer <token>)',
  'commands.token.create.revokeIt': 'Revoke it: mlcl token revoke {name}',
  'commands.token.list.description':
    'List your personal API tokens. Token values are never shown again after creation.',
  'commands.token.list.heading_one': '{count} API token',
  'commands.token.list.heading_other': '{count} API tokens',
  'commands.token.list.empty': 'No API tokens. Create one with: mlcl token create <name>',
  'commands.token.list.revokeHint': '(revoke with: mlcl token revoke <id-or-name>)',
  'commands.token.list.columns.id': 'ID',
  'commands.token.list.columns.name': 'NAME',
  'commands.token.list.columns.created': 'CREATED',
  'commands.token.list.columns.expires': 'EXPIRES',
  'commands.token.list.columns.lastUsed': 'LAST USED',
  'commands.token.list.never': 'never',
  'commands.token.list.expired': '{date} (expired)',
  'commands.token.revoke.description':
    'Revoke a personal API token by id or by name. It stops working.',
  'commands.token.revoke.args.ref': 'The token id, or its name (from mlcl token list)',
  'commands.token.revoke.revoked': 'Revoked token "{name}" ({id}).',
  'commands.token.errors.invalidName': 'A token name must be 1 to 60 characters.',
  'commands.token.errors.invalidExpiry': '--expires-in-days must be a whole number from 1 to 365.',
  'commands.token.errors.nameTaken':
    'You already have a token named "{name}". Pick another name, or revoke that one first.',
  'commands.token.errors.sessionRequired':
    'An API token cannot create, list or revoke tokens. Run `mlcl login` to sign in, then try again.',
  'commands.token.errors.emailNotConfirmed':
    'Confirm your email address first, using the link molecule.dev sent you.',
  'commands.token.errors.limit':
    'You have 25 active tokens, the most allowed. Revoke one you no longer use (mlcl token list).',
  'commands.token.errors.dailyLimit': 'You can create 10 tokens a day. Try again tomorrow.',
  'commands.token.errors.notFound':
    'That token no longer exists. Run `mlcl token list` to see your tokens.',
  'commands.token.errors.noMatch':
    'No token has the id or name "{ref}". Run `mlcl token list` to see your tokens.',
  'commands.token.errors.ambiguous':
    'More than one token is named "{name}". Revoke it by id instead: {ids}',
  'commands.token.errors.noToken':
    'molecule.dev did not return the token. Revoke it (mlcl token revoke {name}) and create another.',

  // ─── lib/registry ───────────────────────────────────────────────
  'lib.registry.errors.notFound':
    'Molecule packages directory not found: {path}\nSet MOLECULE_PACKAGES_DIR or ensure ../molecule/packages exists.',
  'lib.registry.errors.missingRole':
    'No package found in registry for role: stack={stack}, type={type}, category={category}.\nRun "mlcl sync-registry" to rebuild or check registry.json.',
}
