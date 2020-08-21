import child from 'child_process'
import path from 'path'
const bin = path.join(__dirname, '/../lib/bin')

export const tmpDir = path.join(__dirname, '../.tmp')
export const scriptsDir = path.join(tmpDir, 'fixture')

let outputTurnedOn = false

export const turnOnOutput = () => {
  outputTurnedOn = true
}

export const spawnTsNodeDev = (
  cmd: string,
  options: { stdout?: boolean; stderr?: boolean; env?: any } = {}
) => {
  const opts = { ...options }
  const nodeArg = [bin].concat(cmd.split(' '))
  const ps = child.spawn('node', nodeArg, {
    cwd: scriptsDir,
    env: {
      ...process.env,
      ...opts.env,
    },
  })
  let out = ''
  let err = ''

  ps.stderr.on('data', function (data) {
    if (opts.stderr || outputTurnedOn) {
      // eslint-disable-next-line no-console
      console.log('STDERR:', data.toString().replace(/\n$/, ''))
    }
    err += data.toString()
  })
  ps.stdout.on('data', function (data) {
    if (opts.stdout || outputTurnedOn) {
      // eslint-disable-next-line no-console
      console.log('STDOUT:', data.toString().replace(/\n$/, ''))
    }
    out += data.toString()
  })
  ps.on('disconnect', () => {
    // eslint-disable-next-line no-console
    console.log('im out')
  })
  const testPattern = (pattern: string | RegExp, str: string) => {
    return typeof pattern === 'string'
      ? str.indexOf(pattern) >= 0
      : pattern.test(str)
  }
  const self = {
    ps,
    turnOnOutput: () => {
      opts.stderr = true
      opts.stdout = true
      return self
    },
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
    waitForErrorLine: (pattern: string | RegExp) => {
      return new Promise((resolve) => {
        const listener = (data: string) => {
          const line = data.toString()
          if (testPattern(pattern, line)) {
            ps.stderr.removeListener('data', listener)
            resolve(line)
          }
        }
        ps.stderr.on('data', listener)
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
  return self
}
