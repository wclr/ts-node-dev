import * as test from 'tape'
import { spawnTsNodeDev, scriptsDir, tmpDir } from './spawn'
import * as fs from 'fs-extra'
import { join } from 'path'
import { writeFile, removeFile } from '.'

// maybe later
test.skip('Can not find module', async (t) => {
  const foundText = 'FOUND NOW!'

  const createNotFound = () =>
    setTimeout(
      () => writeFile('not-found/not-found.js', `console.log('${foundText}')`),
      100
    )
  const removeNotFound = () => removeFile('not-found/not-found.js')

  // t.test('Not found in TS', async () => {
  //   const ps = spawnTsNodeDev(
  //     [`--respawn`, 'not-found/with-not-found-js'].join(' ')
  //   ).turnOnOutput()

  //   await ps.waitForLine('Cannot find module')

  //   createNotFound()

  //     require.resolve('')

  //   await ps.waitForLine('Restarting')

  //   //await removeNotFound()
  // })

  t.test('Not found in JS', async () => {
    const ps = spawnTsNodeDev(
      ['not-found/js-with-not-found.js'].join(' ')
    ).turnOnOutput()

    await ps.waitForLine('Cannot find module')

    //await removeNotFound()
  })
})
