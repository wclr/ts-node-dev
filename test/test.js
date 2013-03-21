var child = require('child_process')
  , touch = require('touch')
  , expect = require('expect.js')

var dir = __dirname + '/fixture'
  , bin = __dirname + '/../bin/node-dev'

function spawn(cmd, cb) {
  var ps = child.spawn(bin, cmd.split(' '), { cwd: dir })
    , out = ''

  if (cb) ps.stdout.on('data', function(data) {
    out += data.toString()
    var ret = cb.call(ps, out)
    if (typeof ret == 'function') cb = ret
    else if (ret == 'kill') cb = null, ps.kill()
  })
  return ps
}

function touchFile() {
  setTimeout(function() { touch(dir + '/message.js') }, 800)
}

function run(cmd, cb) {
  spawn(cmd, function(out) {
    if (out.match(/touch message.js/)) {
      touchFile()
      return function(out) {
        if (out.match(/Restarting/)) {
          this.kill()
          cb(null, out)
        }
      }
    }
  })
}


describe('node-dev', function() {

  it('should restart the server', function(done) {
    run('server.js', done)
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

  it('should handle errors', function(done) {
    spawn('error.js', function(out) {
      if (out.match(/ERROR/)) {
        touchFile()
        return function(out) {
          if (out.match(/Restarting/)) {
            this.kill()
            done()
            return false
          }
        }
      }
    })
  })

  it('should watch if no such module', function(done) {
    spawn('noSuchModule.js', function(out) {
      expect(out).to.match(/ERROR/)
      done()
      return 'kill'
    })
  })

  it('should ignore caught errors', function(done) {
    spawn('catchNoSuchModule.js', function(out) {
      expect(out).to.match(/Caught/)
      done()
      return 'kill'
    })
  })

  it('should not show up in argv', function(done) {
    spawn('argv.js foo', function(out) {
      var argv = JSON.parse(out.replace(/'/g, '"'))
      expect(argv[0]).to.match(/.*?node$/)
      expect(argv[1]).to.equal('argv.js')
      expect(argv[2]).to.equal('foo')
      done()
      return 'kill'
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
      done()
      return 'kill'
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
      return 'kill'
    })
  })

})
