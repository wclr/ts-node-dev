import * as test from 'tape'
import { spawnTsNodeDev } from './spawn'
import * as fs from 'fs-extra'
import path = require('path')

const tempDir = path.join(__dirname, '../.temp')
export const scriptsDir = path.join(tempDir, 'fixture')

const replaceText = (
  script: string,
  pattern: string | RegExp,
  replace: string
) => {
  const textFile = path.join(scriptsDir, script)
  const text = fs.readFileSync(textFile, 'utf-8')
  fs.writeFileSync(textFile, text.replace(pattern, replace))
}

fs.ensureDir(tempDir)
fs.removeSync(path.join(tempDir, 'fixture'))
fs.copySync(path.join(__dirname, 'fixture'), scriptsDir)

/* 
 node ./bin/ts-node-dev --rt 5 
 --exit-child 
 --tree-kill 
 --clear 
 -r tsconfig-paths/register 
 -r ./test/ts/add-require 
 -r ./test/ts/add-require-2 
 -r esm 
 -O \"{\\\"module\\\": \\\"es6\\\"}\" 
 --preserve-symlinks 
 --respawn --ignore-watch 'lib' 
 --ignore-watch bin --prefer-ts 
 --debug 
 --poll 
 --interval 1000 
 --cache-directory .ts-node 
 --inspect 
 -- test/manual/test-script test-arg --fd
 */

test('It should restart on file change', (t) => {
  const ps = spawnTsNodeDev('--respawn simple.ts', (res) => {
    if (/v1/.test(res)) {
      setTimeout(() => {
        replaceText('dep.ts', 'v1', 'v2')
      }, 500)

      return (res) => {
        if (/v2/.test(res)) {
          t.ok(/Restarting/.test(res), 'Restarting message ok')
          t.ok(true, 'Changed code version applied.')
          return { exit: () => t.end() }
        }
      }
    }
  })
})
