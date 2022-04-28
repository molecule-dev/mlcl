import { Command } from 'commander'
import fs from 'fs'
import xdiff from 'xdiff'
import detectIndent from 'detect-indent'

const encoding = 'utf8'

/**
 * Adds the `x-merge-json` command to the program.
 * 
 * Based off of https://github.com/jonatanpedersen/git-json-merge.
 * Using our own implementation here because we're going to improve it later.
 */
export const xMergeJSON = (program: Command) => {
  program.command(`x-merge-json`)
    .description(`git merge driver for JSON files`)
    .argument(`[baseFilename]`, `base filename`)
    .argument(`[oursFilename]`, `ours filename`)
    .argument(`[theirsFilename]`, `theirs filename`)
    .action(async (baseFilename, oursFilename, theirsFilename) => {
      const baseJson = fs.readFileSync(baseFilename, encoding)
      const base = JSON.parse(baseJson)
      const baseIndent = detectIndent(baseJson).indent

      const oursJson = fs.readFileSync(oursFilename, encoding)
      const ours = JSON.parse(oursJson)
      const oursIndent = detectIndent(oursJson).indent

      const theirsJson = fs.readFileSync(theirsFilename, encoding)
      const theirs = JSON.parse(theirsJson)
      const theirsIndent = detectIndent(theirsJson).indent

      const indent = oursIndent !== baseIndent ? oursIndent : theirsIndent !== baseIndent ? theirsIndent : baseIndent

      const diff = xdiff.diff3(ours, base, theirs)
      const newOurs = diff ? xdiff.patch(base, diff) : base
      const newOursJson = JSON.stringify(newOurs, null, indent)

      fs.writeFileSync(oursFilename, newOursJson, encoding)
    })
}
