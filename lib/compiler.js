var register = require('ts-node').register
var fs = require('fs')
var path = require('path')

var tsHandler
var compiledFiles = {}

var getCompiledPath = require('./get-compiled-path')
var tmpDir = '.ts-node'

function makeDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdir(dir)
  }
}

var extensions = ['.ts', '.tsx']
var empty = function () { }

var compiler = {
  allowJs: false,
  init: function (options) {
    var originalJsHandler = require.extensions['.js']
    require.extensions['.ts'] = empty
    require.extensions['.tsx'] = empty
    const tsNodeOptions = {
      fast: options['fast'],
      cache: options['cache'] || !options['no-cache'],
      cacheDirectory: options['cache-directory'] || path.join(tmpDir, 'cache'),
      compiler: options['compiler'],
      project: options['project'],
      ignore: options['ignore'],
      ignoreWarnings: options['ignoreWarnings'],
      disableWarnings: options['disableWarnings'],
      compilerOptions: options['compilerOptions']
    }
    register(tsNodeOptions)
    /* check if `allowJs` compiler option enable */
    var allowJsEnabled = require.extensions['.js'] !== originalJsHandler
    if (allowJsEnabled) {
      compiler.allowJs = true
      require.extensions['.js'] = originalJsHandler
      extensions.push('.js')
    }
    tsHandler = require.extensions['.ts']
    makeDir(tmpDir)
    makeDir(path.join(tmpDir, 'compiled'))
  },
  compileChanged: function (fileName) {
    const ext = path.extname(fileName)
    if (extensions.indexOf(ext) < 0) return
    try {
      const code = fs.readFileSync(fileName, 'utf-8')
      compiler.compile({
        code: code,
        compile: fileName,
        compiledPath: getCompiledPath(code, fileName)
      })
    } catch (e) {
      console.error(e)
    }
  },
  compile: function (params) {
    var fileName = params.compile
    var code = params.code
    var compiledPath = params.compiledPath
    if (fs.existsSync(compiledPath)) {
      return
    }
    var m = {
      _compile: function (code) {
        fs.writeFileSync(compiledPath, code, 'utf-8')
      }
    }
    tsHandler(m, fileName)
    try {
      m._compile(code, fileName)
    } catch (e) {
      console.error(e)
    }
  }
}

module.exports = compiler