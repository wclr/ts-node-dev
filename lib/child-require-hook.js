var fs = require('fs')
var getCompiledPath = require('./get-compiled-path')
var sep = require('path').sep

var timeThreshold = 10000
var allowJs = false
var compiledDir
var preferTs = false
var ignore = /node_modules/

var compile = (code, fileName) => {
  var compiledPath = getCompiledPath(code, fileName, compiledDir)
  process.send({
    compile: fileName,
    code: code,
    compiledPath: compiledPath
  })
  var compiled
  var start = new Date().getTime()
  var timeout = false
  while (compiled === undefined || timeout) {    
    if (fs.existsSync(compiledPath + '.done')) {
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
    var old = require.extensions[ext] || require.extensions['.js']
    require.extensions[ext] = function (m, fileName) {
      var _compile = m._compile
      m._compile = function (code, fileName) {
        return _compile.call(this, compile(code, fileName), fileName)
      }
      return old(m, fileName)
    }
  })
}

function isFileInNodeModules(fileName) {
  return fileName.indexOf(sep + 'node_modules' + sep) >= 0
}

function registerJsExtension() {
  var old = require.extensions['.js']
  if (allowJs || preferTs) {
    require.extensions['.js'] = function (m, fileName) {
      var tsCode
      var tsFileName
      if (preferTs && !isFileInNodeModules(fileName)) {
        tsFileName = fileName.replace(/\.js$/, '.ts')
        if (fs.existsSync(tsFileName)) {
          tsCode = fs.readFileSync(tsFileName, 'utf-8')
        }
      }
      var _compile = m._compile
      var isIgnored = ignore && ignore.test(fileName)
      if (tsCode !== undefined || (allowJs && !isIgnored)) {
        m._compile = function (code, fileName) {
          if (tsCode !== undefined) {
            code = tsCode
            fileName = tsFileName
          }
          return _compile.call(this, compile(code, fileName), fileName)
        }
      }
      return old(m, fileName)
    }
  }
}

registerExtensions(['.ts', '.tsx'])
registerJsExtension()

module.exports.registerExtensions = registerExtensions