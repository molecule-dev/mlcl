import { spawnSync } from 'child_process'

/**
 * Returns the root path of the current git repository.
 */
export const getRepoRootPathSync = () => {
  try {
    const spawn = spawnSync('git', ['rev-parse', '--show-toplevel'])
    return spawn.stdout.toString().trim() || `.`
  } catch (error) {
    return `.`
  }
}
