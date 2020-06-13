import child = require('child_process')
import path = require('path')
import { resolve } from 'url'
import { resolveSoa } from 'dns'
const bin = path.join(__dirname, '/../bin/ts-node-dev')
const scriptsDir = path.join(__dirname, '/../.temp/fixture')

export const spawnTsNodeDev = (
  cmd: string,
  opts: { stdout?: boolean; stderr?: boolean; env?: any } = {}
) => {
  const nodeArg = [bin].concat(cmd.split(' '))
  const ps = child.spawn('node', nodeArg, { cwd: scriptsDir, env: opts.env })
  var out = ''
  var err = ''

  ps.stderr.on('data', function (data) {
    if (opts.stderr) {
      console.log('STDERR:', data.toString())
    }
    err += data.toString()
  })
  ps.stdout.on('data', function (data) {
    if (opts.stdout) {
      console.log('STDOUT:', data.toString())
    }
    out += data.toString()
  })

  const testPattern = (pattern: string | RegExp, str: string) => {
    return typeof pattern === 'string'
      ? str.indexOf(pattern) >= 0
      : pattern.test(str)
  }

  return {
    ps,
    getStdout: () => out,
    getStderr: () => err,
    waitForLine: (pattern: string | RegExp) => {
      return new Promise((resolve) => {
        const listener = (data: string) => {
          const line = data.toString()
          if (testPattern(pattern, line)) {
            ps.stdout.removeListener('data', listener)
            resolve(line)
          }
        }
        ps.stdout.on('data', listener)
      })
    },
    exit: () => {
      return new Promise((resolve) => {
        ps.stdout.removeAllListeners('data')
        ps.stderr.removeAllListeners('data')
        ps.removeAllListeners('exit')
        ps.on('exit', function (code) {
          resolve(code)
        })
        ps.kill()
      })
    },
  }
}
