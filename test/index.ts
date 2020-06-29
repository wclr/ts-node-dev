import * as test from 'tape'
import { spawnTsNodeDev, scriptsDir, tmpDir } from './spawn'
import * as fs from 'fs-extra'
import { join } from 'path'
import touch = require('touch')

const replaceText = async (
  script: string,
  pattern: string | RegExp,
  replace: string
) => {
  const textFile = join(scriptsDir, script)
  const text = await fs.readFile(textFile, 'utf-8')
  return fs.writeFile(textFile, text.replace(pattern, replace))
}

const writeFile = async (script: string, text: string) => {
  const textFile = join(scriptsDir, script)
  return fs.writeFile(textFile, text)
}

const removeFile = async (script: string) => {
  const textFile = join(scriptsDir, script)
  return fs.remove(textFile)
}

const waitFor = (timeout: number) => {
  return new Promise((resolve) => setTimeout(resolve, timeout))
}

fs.ensureDirSync(tmpDir)
fs.removeSync(join(tmpDir, 'fixture'))
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
  const ps = spawnTsNodeDev('--respawn --poll simple.ts')
  await ps.waitForLine(/v1/)
  setTimeout(() => replaceText('dep.ts', 'v1', 'v2'), 250)
  await ps.waitForLine(/v2/)
  t.pass('Changed code version applied.')
  await ps.exit()
  // revert
  replaceText('dep.ts', 'v2', 'v1')
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
  await replaceText('with-error.ts', '1', `'1'`)
})

test('It should restart on adding not imported module', async (t) => {
  const ps = spawnTsNodeDev('--respawn with-error.ts', {
    // stdout: true,
    env: {
      TS_NODE_DEV_ERROR_RECOMPILE_TIMEOUT: 500,
    },
  })
  await ps.waitForLine(/[ERROR]/)

  setTimeout(() => replaceText('dep-ts-error.ts', 'number', 'string'), 250)

  await ps.waitForLine(/v1/)
  t.pass('Restarted successfully after error fixed.')
  await ps.exit()
  await replaceText('dep-ts-error.ts', 'string', 'number')
})

const notFoundSource = `export const fn = (x: number) => {  
  return 'v1'
}
`
test('It restarts when not found module added', async (t) => {
  const ps = spawnTsNodeDev('--respawn with-not-found.ts', {
    //stdout: true,
    env: {
      TS_NODE_DEV_ERROR_RECOMPILE_TIMEOUT: 250,
    },
  })
  await ps.waitForLine(/[ERROR]/)

  setTimeout(() => writeFile('not-found.ts', notFoundSource), 1000)

  await ps.waitForLine(/v1/)
  t.pass('Restarted successfully after module was created.')
  await ps.exit()
  await removeFile('not-found.ts')
})

test('It handles allowJs option and loads JS modules', async (t) => {
  const cOptions = { allowJs: true }
  const ps = spawnTsNodeDev(
    [
      `--respawn`,
      `--compiler ttypescript`,
      `--compilerOptions=${JSON.stringify(cOptions)}`,
      `js-module.js`,
    ].join(' ')
  ).turnOnOutput()
  await ps.waitForLine(/JS MODULE/)
  await ps.exit()
})

test('It allows use TS Transformers', async (t) => {
  const cOptions = { plugins: [{ transform: 'ts-nameof', type: 'raw' }] }
  const ps = spawnTsNodeDev(
    [
      `--respawn`,
      `--compiler ttypescript`,
      `--compilerOptions=${JSON.stringify(cOptions)}`,
      `nameof.ts`,
    ].join(' ')
  ) //.turnOnOutput()
  await ps.waitForLine(/console/)

  await ps.exit()
})

test('It allows use custom TS Transformers', async (t) => {
  const cOptions = { plugins: [{ transform: __dirname + '/transformer.ts' }] }
  const ps = spawnTsNodeDev(
    [
      `--respawn`,
      `--compiler ttypescript`,
      `--compilerOptions=${JSON.stringify(cOptions)}`,
      `to-transform.ts`,
    ].join(' ')
  ) //.turnOnOutput()
  await ps.waitForLine(/transformed/)
  await ps.exit()
})

// TODO: fix --graceful_ipc option won't work with spawnTsNodeDev()
// p.s the option works when manually running node on the terminal like this:
// node .\bin\ts-node-dev --graceful_ipc=AWESOME .\test\fixture\graceful-ipc.ts
test.skip('It send IPC message during restart events', async (t) => {
  const ps = spawnTsNodeDev('--graceful_ipc="GRACETERM" graceful-ipc.ts')

  // changing the file to trigger restart
  setTimeout(() => replaceText('graceful-ipc.ts', 'v1', 'v2'), 250)
  
  await ps.waitForLine(/GRACETERM/)

  await ps.exit()

  replaceText('graceful-ipc.ts', 'v2', 'v1')
})
