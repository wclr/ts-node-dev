import * as test from 'tape'
import { spawnTsNodeDev } from './spawn'
import * as fs from 'fs-extra'
import { join } from 'path'
import touch = require('touch')

const tempDir = join(__dirname, '../.temp')
export const scriptsDir = join(tempDir, 'fixture')

const replaceText = async (
  script: string,
  pattern: string | RegExp,
  replace: string
) => {
  const textFile = join(scriptsDir, script)
  const text = await fs.readFile(textFile, 'utf-8')
  return fs.writeFile(textFile, text.replace(pattern, replace))
}

const waitFor = (timeout: number) => {
  return new Promise((resolve) => setTimeout(resolve, timeout))
}

fs.ensureDir(tempDir)
fs.removeSync(join(tempDir, 'fixture'))
fs.copySync(join(__dirname, 'fixture'), scriptsDir)

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

test('It should restart on file change', async (t) => {
  const ps = spawnTsNodeDev('--respawn --poll simple.ts', {stdout: true})
  await ps.waitForLine(/v1/)
  setTimeout(() => replaceText('dep.ts', 'v1', 'v2'), 250)
  await ps.waitForLine(/v2/)
  t.pass('Changed code version applied.')
  await ps.exit()
})

test('It allow watch arbitrary folder/file', async (t) => {
  const ps = spawnTsNodeDev('--respawn --watch folder,folder2 simple.ts')
  await ps.waitForLine(/Using/)
  setTimeout(() => touch(join(scriptsDir, 'folder/some-file')), 250)
  await ps.waitForLine(/Restarting.*some-file/)
  t.pass('works')
  await ps.exit()
})

test('It should report an error on start', async (t) => {
  const ps = spawnTsNodeDev('--respawn with-error.ts')
  await ps.waitForLine(/[ERROR]/)
  const out = ps.getStdout()
  t.ok(/Compilation error in/.test(out), 'Report error file')
  t.ok(/[ERROR].*Unable to compile TypeScript/.test(out), 'Report TS error')
  t.ok(/Argument of type/.test(out), 'Report TS error diagnostics')

  setTimeout(() => replaceText('with-error.ts', `'1'`, '1'), 250)

  // PROBLEM: if we try to fix not required/compiled dep it does not work.
  // setTimeout(() => replaceText('dep-ts-error.ts', 'number', 'string'), 250)

  await ps.waitForLine(/v1/)
  t.pass('Restarted successfully after error fixed.')
  await ps.exit()
})
