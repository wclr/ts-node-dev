var exec = require('child_process').execFile
  , should = require('should')

describe('foo', function() {

  it('should work', function(done) {
    exec(__dirname + '/../bin/node-dev', ['server'], {cwd: __dirname + '/fixture', timeout: 1000}, function(error, stdout, stderr) {
      console.log(stdout)
      done()
    })
  })
})
