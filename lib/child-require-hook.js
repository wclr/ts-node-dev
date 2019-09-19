var fs = require('fs')
var getCompiledPath = require('./get-compiled-path')
var sep = require('path').sep
var join = require('path').join
var execSync = require('child_process').execSync
var compilationId
var timeThreshold = 0
var allowJs = false
var compiledDir
var preferTs = false
var ignore = [/node_modules/]
var readyFile
var execCheck = false
var exitChild = false
var sourceMapSupportPath

var checkFileScript = join(__dirname, 'check-file-exists.js')

var waitForFile = function(fileName) {
  var start = new Date().getTime()
  while (true) {
    const exists = execCheck
      ? execSync(['node', checkFileScript, '"' + fileName + '"'].join(' '), {
          stdio: 'inherit'
        }) || true
      : fs.existsSync(fileName)

    if (exists) {
      return
    }
    var passed = new Date().getTime() - start
    if (timeThreshold && passed > timeThreshold) {
      throw new Error('Could not require ' + fileName)
    }
  }
}

var compile = (code, fileName) => {
  var compiledPath = getCompiledPath(code, fileName, compiledDir)
  process.send({
    compile: fileName,
    compiledPath: compiledPath
  })
  var compileRequestFile = [compiledDir, compilationId + '.req'].join(sep)
  fs.writeFileSync(compileRequestFile, [fileName, compiledPath].join('\n'))
  waitForFile(compiledPath + '.done')
  var compiled = fs.readFileSync(compiledPath, 'utf-8')
  return compiled
}

function registerExtensions(extensions) {
  extensions.forEach(function(ext) {
    var old = require.extensions[ext] || require.extensions['.js']
    require.extensions[ext] = function(m, fileName) {
      var _compile = m._compile
      m._compile = function(code, fileName) {
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
    require.extensions['.js'] = function(m, fileName) {
      var tsCode
      var tsFileName
      if (preferTs && !isFileInNodeModules(fileName)) {
        tsFileName = fileName.replace(/\.js$/, '.ts')
        if (fs.existsSync(tsFileName)) {
          tsCode = fs.readFileSync(tsFileName, 'utf-8')
        }
      }
      var _compile = m._compile
      var isIgnored =
        ignore &&
        ignore.reduce(function(res, ignore) {
          return res || ignore.test(fileName)
        }, false)
      if (tsCode !== undefined || (allowJs && !isIgnored)) {
        m._compile = function(code, fileName) {
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

require(sourceMapSupportPath).install({
  hookRequire: true
})

registerExtensions(['.ts', '.tsx'])
registerJsExtension()

if (readyFile) {
  var time = new Date().getTime()
  while (!fs.existsSync(readyFile)) {
    if (new Date().getTime() - time > 5000) {
      throw new Error('Waiting ts-node-dev ready file failed')
    }
  }
}

if (exitChild) {
  process.on('SIGTERM', function() {
    console.log('Child got SIGTERM, exiting.')
    process.exit()
  })
}

module.exports.registerExtensions = registerExtensions
