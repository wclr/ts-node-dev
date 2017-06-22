var fs = require('fs')
var getCompiledPath = require('./get-compiled-path')

var timeThreshold = 10000

var compile = (code, fileName) => {
  var compiledPath = getCompiledPath(code, fileName)
  process.send({
    compile: fileName,
    code: code,
    compiledPath: compiledPath
  })
  var compiled
  var start = new Date().getTime()
  var timeout = false
  while (compiled === undefined || timeout) {
    if (fs.existsSync(compiledPath)) {
      compiled = fs.readFileSync(compiledPath, 'utf-8')
    }
    var passed = (new Date().getTime() - start)
    if (passed > timeThreshold) {
      throw new Error(
        'Could not require ' + fileName + ', compiled path:' + compiledPath
      )
    }
  }
  return compiled
}

function registerExtensions(extensions) {
  extensions.forEach(function (ext) {
    const old = require.extensions[ext] || require.extensions['.js']
    require.extensions[ext] = function (m, filename) {
      const _compile = m._compile
      m._compile = function (code, fileName) {
        return _compile.call(this, compile(code, fileName), fileName)
      }
      return old(m, filename)
    }
  })
}

registerExtensions(['.ts', '.tsx'])

module.exports.registerExtensions = registerExtensions