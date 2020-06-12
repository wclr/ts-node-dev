import child = require('child_process')
import path = require('path')
const bin = path.join(__dirname, '/../bin/ts-node-dev')
const scriptsDir = path.join(__dirname, '/../.temp/fixture')

export const spawnTsNodeDev = (
  cmd: string,
  cb: (res: string, code: number, signal: string) => any
) => {
  const nodeArg = [bin].concat(cmd.split(' '))
  const ps = child.spawn('node', nodeArg, { cwd: scriptsDir })
  var out = ''
  var err = ''

  if (cb) {
    // capture stderr
    ps.stderr.on('data', function (data) {
      err += data.toString()
    })

    // invoke callback
    ps.on('exit', function (code, signal) {
      if (err) cb(err, code, signal)
    })

    ps.stdout.on('data', function (data) {
      out += data.toString()
      var ret = cb.call(ps, out)
      if (typeof ret == 'function') {
        // use the returned function as new callback
        cb = ret
      } else if (ret && ret.exit) {
        // kill the process and invoke the given function
        ps.stdout.removeAllListeners('data')
        ps.stderr.removeAllListeners('data')
        ps.removeAllListeners('exit')
        ps.on('exit', function () {
          setTimeout(ret.exit, 1000)
        })
        ps.kill()
      }
    })
  }

  return ps
}
