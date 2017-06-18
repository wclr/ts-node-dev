var fs = require('fs')
var getCompiledPath = require('./get-compiled-path')

var triesThreshold = 1000

var compile = (code, fileName) => {
  var compiledPath = getCompiledPath(code, fileName)
  process.send({
    compile: fileName,
    code: code,
    compiledPath: compiledPath    
  })
  let tries = 0
  let compiled
  while (!compiled) {
    try {
      compiled = fs.readFileSync(compiledPath, 'utf-8')
    } catch (e) { }
    tries++
    if (tries >= triesThreshold) {
      throw new Error('Could not require' + fileName)
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