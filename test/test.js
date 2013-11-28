var fs = require('fs')
  , child = require('child_process')
  , expect = require('expect.js')

var dir = __dirname +  '/fixture'
  , bin = __dirname + '/../bin/node-dev'
  , msgFile = dir + '/message.js'
  , msg = 'module.exports = "Please touch message.js now"\n'

function touch() {
  fs.writeFileSync(msgFile, msg)
}

function spawn(cmd, cb) {
  var ps = child.spawn('node', [bin].concat(cmd.split(' ')), { cwd: dir })
    , out = ''

  if (cb) ps.stdout.on('data', function(data) {
    out += data.toString()
    var ret = cb.call(ps, out)
    if (typeof ret == 'function') cb = ret
    else if (ret && ret.exit) {
      ps.stdout.removeAllListeners('data')
      ps.on('exit', function() { setTimeout(ret.exit, 1000) })
      ps.kill()
    }
  })
  return ps
}

function run(cmd, done) {
  spawn(cmd, function(out) {
    if (out.match(/touch message.js/)) {
      setTimeout(touch, 500)
      return function(out) {
        if (out.match(/Restarting/)) {
          return { exit: done }
        }
      }
    }
  })
}


describe('node-dev', function() {

  it('should restart the server', function(done) {
    run('server.js', done)
  })

  it('should restart the server twice', function(done) {
    spawn('server.js', function(out) {
      if (out.match(/touch message.js/)) {
        setTimeout(touch, 500)
        return function(out) {
          if (out.match(/Restarting/)) {
            setTimeout(touch, 500)
            return function(out) {
              if (out.match(/Restarting/)) {
                return { exit: done }
              }
            }
          }
        }
      }
    })
  })

  it('should restart the cluster', function(done) {
    run('cluster.js', done)
  })

  it('should support vm functions', function(done) {
    run('vmtest.js', done)
  })

  it('should support coffee-script', function(done) {
    run('server.coffee', done)
  })

  it('should restart when a file is renamed', function(done) {
    var tmp = dir + '/message.tmp'
    fs.writeFileSync(tmp, msg)
    spawn('log.js', function(out) {
      if (out.match(/touch message.js/)) {
        fs.renameSync(tmp, msgFile)
        return function(out) {
          if (out.match(/Restarting/)) {
            return { exit: done }
          }
        }
      }
    })
  })

  it('should handle errors', function(done) {
    spawn('error.js', function(out) {
      if (out.match(/ERROR/)) {
        setTimeout(touch, 500)
        return function(out) {
          if (out.match(/Restarting/)) {
            return { exit: done }
          }
        }
      }
    })
  })

  it('should watch if no such module', function(done) {
    spawn('noSuchModule.js', function(out) {
      expect(out).to.match(/ERROR/)
      return { exit: done }
    })
  })

  it('should ignore caught errors', function(done) {
    spawn('catchNoSuchModule.js', function(out) {
      expect(out).to.match(/Caught/)
      return { exit: done }
    })
  })

  it('should not show up in argv', function(done) {
    spawn('argv.js foo', function(out) {
      var argv = JSON.parse(out.replace(/'/g, '"'))
      expect(argv[0]).to.match(/.*?node(\.exe)?$/)
      expect(argv[1]).to.equal('argv.js')
      expect(argv[2]).to.equal('foo')
      return { exit: done }
    })
  })

  it('should pass through the exit code', function(done) {
    spawn('exit.js').on('exit', function(code) {
      expect(code).to.be(101)
      done()
    })
  })

  it('should conceil the wrapper', function(done) {
    // require.main should be main.js not wrap.js!
    spawn('main.js').on('exit', function(code) {
      expect(code).to.be(0)
      done()
    })
  })

  it('should relay stdin', function(done) {
    spawn('echo.js', function(out) {
      expect(out).to.equal('foo')
      return { exit: done }
    }).stdin.write('foo')
  })

  it('should kill the forked processes', function(done) {
    spawn('pid.js', function(out) {
      var pid = parseInt(out, 10)
      this.on('exit', function() {
        setTimeout(function() {
          try {
            process.kill(pid)
            done('child must no longer run')
          }
          catch(e) {
            done()
          }
        }, 500)
      })
      return { exit: done }
    })
  })

})
