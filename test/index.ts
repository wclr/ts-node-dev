import * as test from 'tape'
import { spawnTsNodeDev, scriptsDir, tmpDir, turnOnOutput } from './spawn'
import * as fs from 'fs-extra'
import { join } from 'path'
import touch = require('touch')

if (process.argv.slice(2)[0] === '--output') {
  turnOnOutput()
}

export const replaceText = async (
  script: string,
  pattern: string | RegExp,
  replace: string
) => {
  const textFile = join(scriptsDir, script)
  const text = await fs.readFile(textFile, 'utf-8')
  return fs.writeFile(textFile, text.replace(pattern, replace))
}

export const writeFile = async (script: string, text: string) => {
  const textFile = join(scriptsDir, script)
  return fs.writeFile(textFile, text)
}

export const removeFile = async (script: string) => {
  const textFile = join(scriptsDir, script)
  return fs.remove(textFile)
}

const waitFor = (timeout: number) => {
  return new Promise((resolve) => setTimeout(resolve, timeout))
}

fs.ensureDirSync(tmpDir)
fs.removeSync(join(tmpDir, 'fixture'))
fs.copySync(join(__dirname, 'fixture'), scriptsDir)

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
  t.ok(/Compilation error in/.test(out), 'Reports error file')
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

test('It should report an error with --log-error and continue to work', async (t) => {
  const ps = spawnTsNodeDev('--respawn --log-error with-error.ts')
  await ps.waitForErrorLine(/error/)

  const out = ps.getStderr()
  t.ok(/error.*Argument of type/.test(out), 'Reports error in stderr')

  setTimeout(() => replaceText('with-error.ts', `'1'`, '1'), 250)

  await ps.waitForLine(/Restarting:/)
  await ps.waitForLine(/v1/)
  t.pass('Restarted successfully after error fixed.')
  await ps.exit()
  await replaceText('with-error.ts', '1', `'1'`)
})

test('It should restart on adding not imported module', async (t) => {
  const ps = spawnTsNodeDev('--respawn --error-recompile with-error.ts', {
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
test('It recompiles file on error and restarts', async (t) => {
  const ps = spawnTsNodeDev('--respawn --error-recompile with-not-found.ts', {
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
      `--compiler-options=${JSON.stringify(cOptions)}`,
      `js-module.js`,
    ].join(' ')
  )
  await ps.waitForLine(/JS MODULE/)
  t.pass('ok')
  await ps.exit()
})

test('It handles resolveJsonModule option and loads JSON modules', async (t) => {
  const cOptions = { resolveJsonModule: true }
  const ps = spawnTsNodeDev(
    [
      `--respawn`,
      `--compiler ttypescript`,
      `--compiler-options=${JSON.stringify(cOptions)}`,
      `import-json`,
    ].join(' ')
  )
  await ps.waitForLine(/JSON DATA: { file: 'json' }/)
  t.pass('ok')
  await ps.exit()
})

test('It should not allow --script-mode and --dir together', async (t) => {
  const ps = spawnTsNodeDev(
    [`--script-mode`, `--dir folder`, `simple.ts`].join(' ')
  )
  await ps.waitForLine(/TypeError: Script mode cannot be combined with `--dir`/)
  t.pass('ok')
  await ps.exit()
})

test('It should use the tsconfig at --dir when defined', async (t) => {
  const ps = spawnTsNodeDev([`--dir dir-test`, `dir-test/index.ts`].join(' '))
  await ps.waitForLine(/\{ hello: 'world' \}/)
  t.pass('ok')
  await ps.exit()
})

test('It should use the tsconfig at --script-mode when defined', async (t) => {
  const ps = spawnTsNodeDev([`-s`, `dir-test/index.ts`].join(' '))
  await ps.waitForLine(/\{ hello: 'world' \}/)
  t.pass('ok')
  await ps.exit()
})

test('It should fail if not using --dir or --script-mode on dir-test/index.ts', async (t) => {
  const cOptions = { allowJs: true }
  const ps = spawnTsNodeDev(
    [
      `--compiler-options=${JSON.stringify(cOptions)}`,
      `dir-test/index.ts`,
    ].join(' ')
  )
  await ps.waitForLine(/has no default export./)
  t.pass('ok')
  await ps.exit()
})

test('It allows to use TS Transformers', async (t) => {
  const cOptions = { plugins: [{ transform: 'ts-nameof', type: 'raw' }] }
  const ps = spawnTsNodeDev(
    [
      `--respawn`,
      `--compiler ttypescript`,
      `--compiler-options=${JSON.stringify(cOptions)}`,
      `nameof.ts`,
    ].join(' ')
  )
  await ps.waitForLine(/console/)

  await ps.exit()
})

test('It allows to use custom TS Transformers', async (t) => {
  const cOptions = { plugins: [{ transform: __dirname + '/transformer.ts' }] }
  const ps = spawnTsNodeDev(
    [
      `--respawn`,
      `--compiler ttypescript`,
      `--compiler-options=${JSON.stringify(cOptions)}`,
      `to-transform.ts`,
    ].join(' ')
  )
  await ps.waitForLine(/transformed/)
  t.pass('ok')
  await ps.exit()
})

test('It should --prefer-ts', async (t) => {
  t.test('Should require JS by default', async (t) => {
    const ps = spawnTsNodeDev(
      [
        `--respawn`,
        //`--prefer-ts-exts`,
        `prefer/prefer.js`,
      ].join(' ')
    )
    await ps.waitForLine(/PREFER DEP JS/)
    await ps.waitForLine(/PREFER JS/)
    await ps.exit()
    t.pass()
  })
  t.test('Should require JS deps by default', async (t) => {
    const ps = spawnTsNodeDev(
      [
        `--respawn`,
        //`--prefer-ts`,
        `prefer/prefer`,
      ].join(' ')
    ) //.turnOnOutput()
    await ps.waitForLine(/PREFER DEP JS/)
    await ps.waitForLine(/PREFER TS/)
    await ps.exit()
    t.pass()
  })

  t.test('Use require all TS with --ts-prefer', async (t) => {
    const ps = spawnTsNodeDev(
      [`--respawn`, `--prefer-ts-exts`, `prefer/prefer`].join(' ')
    ) //.turnOnOutput()
    await ps.waitForLine(/PREFER DEP TS/)
    await ps.waitForLine(/PREFER TS/)

    setTimeout(() => replaceText('prefer/prefer-dep.ts', 'DEP', 'DEP MOD'), 250)

    await ps.waitForLine(/PREFER DEP MOD TS/)

    await ps.exit()
    t.pass()
    replaceText('prefer/prefer-dep.ts', 'DEP MOD', 'DEP')
  })
})
// watching required with -r not implemented
test.skip('It should add require with -r flag', async (t) => {
  const ps = spawnTsNodeDev(
    [
      `-r ./add-req`,
      //`--debug`,
      `simple`,
    ].join(' ')
  )
  await ps.waitForLine(/added --require/)
  await ps.waitForLine(/v1/)

  //setTimeout(() => replaceText('add-req', 'added', 'changed'), 250)
  //await ps.exit()
  //
  await ps.waitForLine(/changed --require/)
  t.pass()
  t.end()
})

test('It should handle --deps flag', async (t) => {
  const ps = spawnTsNodeDev([`--deps`, `--respawn`, `req-package`].join(' '))

  await ps.waitForLine(/PACKAGE/)

  setTimeout(
    () =>
      replaceText(
        'node_modules/package/index.js',
        'PACKAGE',
        'CHANGED PACKAGE'
      ),
    100
  )

  await ps.waitForLine(/CHANGED PACKAGE/)
  await ps.exit()
  t.pass()
  t.end()
})


test('It should handle deep deps with --deps flag', async (t) => {
  const ps = spawnTsNodeDev([`--all-deps`, `--respawn`, `req-package`].join(' '))

  await ps.waitForLine(/PACKAGE/)

  setTimeout(
    () =>
      replaceText(
        'node_modules/package/node_modules/level2-package/index.js',
        'PACKAGE',
        'CHANGED PACKAGE'
      ),
    100
  )

  await ps.waitForLine(/CHANGED PACKAGE/)
  await ps.exit()
  t.pass()
  t.end()
})
