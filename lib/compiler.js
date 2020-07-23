var tsNode = require('ts-node')

var fs = require('fs')
var path = require('path')
var os = require('os')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var { resolveSync } = require('tsconfig')

var getCompiledPath = require('./get-compiled-path')
var tmpDir = '.ts-node'

const fixPath = (p) => p.replace(/\\/g, '/').replace(/\$/g, '$$$$')

var sourceMapSupportPath = require.resolve('source-map-support')

var extensions = ['.ts', '.tsx']
var empty = function () {}
var cwd = process.cwd()
var compilationInstanceStamp = Math.random().toString().slice(2)

var originalJsHandler = require.extensions['.js']

var extHandlers = {}

function hasOwnProperty (object, property) {
  return Object.prototype.hasOwnProperty.call(object, property)
}

function getCwd(dir, scriptMode, scriptPath) {
  if (scriptMode) {
    if (!scriptPath) {
      throw new TypeError('Script mode must be used with a script name, e.g. `ts-node-dev -s <script.ts>`')
    }

    if (dir) {
      throw new TypeError('Script mode cannot be combined with `--dir`')
    }
    
    // Use node's own resolution behavior to ensure we follow symlinks.
    // scriptPath may omit file extension or point to a directory with or without package.json.
    // This happens before we are registered, so we tell node's resolver to consider ts, tsx, and jsx files.
    // In extremely rare cases, is is technically possible to resolve the wrong directory,
    // because we do not yet know preferTsExts, jsx, nor allowJs.
    // See also, justification why this will not happen in real-world situations:
    // https://github.com/TypeStrong/ts-node/pull/1009#issuecomment-613017081
    const exts = ['.js', '.jsx', '.ts', '.tsx']
    const extsTemporarilyInstalled = []
    for (const ext of exts) {
      if (!hasOwnProperty(require.extensions, ext)) { // tslint:disable-line
        extsTemporarilyInstalled.push(ext)
        require.extensions[ext] = function() {} // tslint:disable-line
      }
    }
    try {
      return path.dirname(require.resolve(scriptPath))
    } finally {
      for (const ext of extsTemporarilyInstalled) {
        delete require.extensions[ext] // tslint:disable-line
      }
    }
  }
  
  return dir
}


var compiler = {
  allowJs: false,
  tsConfigPath: '',
  _errorCompileTimeout: 0,
  getCompilationId: function () {
    return compilationInstanceStamp
  },
  createCompiledDir: function () {
    var compiledDir = compiler.getCompiledDir()
    if (!fs.existsSync(compiledDir)) {
      mkdirp.sync(compiler.getCompiledDir())
    }
  },
  getCompiledDir: function () {
    return path.join(tmpDir, 'compiled').replace(/\\/g, '/')
  },
  getCompileReqFilePath: function () {
    return path.join(
      compiler.getCompiledDir(),
      compiler.getCompilationId() + '.req'
    )
  },
  getCompilerReadyFilePath: function () {
    return path
      .join(os.tmpdir(), 'ts-node-dev-ready-' + compilationInstanceStamp)
      .replace(/\\/g, '/')
  },
  getChildHookPath: function () {
    return path
      .join(os.tmpdir(), 'ts-node-dev-hook-' + compilationInstanceStamp + '.js')
      .replace(/\\/g, '/')
  },
  writeReadyFile: function () {
    var fileData = fs.writeFileSync(compiler.getCompilerReadyFilePath(), '')
  },
  writeChildHookFile: function (options) {
    var fileData = fs.readFileSync(
      path.join(__dirname, 'child-require-hook.js'),
      'utf-8'
    )
    var compileTimeout = parseInt(options['compile-timeout'])
    if (compileTimeout) {
      fileData = fileData.replace('10000', compileTimeout.toString())
    }
    if (compiler.allowJs) {
      fileData = fileData.replace('allowJs = false', 'allowJs = true')
    }
    if (options['prefer-ts'] || options['prefer-ts-exts']) {
      fileData = fileData.replace('preferTs = false', 'preferTs = true')
    }
    if (options['exec-check']) {
      fileData = fileData.replace('execCheck = false', 'execCheck = true')
    }

    if (options['exit-child']) {
      fileData = fileData.replace('exitChild = false', 'exitChild = true')
    }
    if (options['ignore'] !== undefined) {
      var ignore = options['ignore']
      var ignoreVal =
        !ignore || ignore === 'false'
          ? 'false'
          : '[' +
            (Array.isArray(ignore) ? ignore : ignore.split(/, /))
              .map((ignore) => 'new RegExp("' + ignore + '")')
              .join(', ') +
            ']'
      fileData = fileData.replace(
        'var ignore = [/node_modules/]',
        'var ignore = ' + ignoreVal
      )
    }
    fileData = fileData.replace(
      'var compilationId',
      'var compilationId = "' + compiler.getCompilationId() + '"'
    )
    fileData = fileData.replace(
      'var compiledDir',
      'var compiledDir = "' + compiler.getCompiledDir() + '"'
    )
    fileData = fileData.replace(
      './get-compiled-path',
      fixPath(path.join(__dirname, 'get-compiled-path'))
    )
    fileData = fileData.replace(
      'var readyFile',
      'var readyFile = "' + compiler.getCompilerReadyFilePath() + '"'
    )
    fileData = fileData.replace(
      'var sourceMapSupportPath',
      'var sourceMapSupportPath = "' + fixPath(sourceMapSupportPath) + '"'
    )
    fileData = fileData.replace(
      'var libPath',
      'var libPath = "' + __dirname.replace(/\\/g, '\\\\') + '"'
    )
    fileData = fileData.replace(/__dirname/, '"' + fixPath(__dirname) + '"')
    fs.writeFileSync(compiler.getChildHookPath(), fileData)
  },
  clearErrorCompile: () => {
    clearTimeout(compiler._errorCompileTimeout)
  },
  init: function (options) {
    compiler.options = options
    var project = options['project']
    compiler.log = options.log
    compiler.tsConfigPath =
      resolveSync(cwd, typeof project === 'string' ? project : undefined) || ''

    //var originalJsHandler = require.extensions['.js']
    require.extensions['.ts'] = empty
    require.extensions['.tsx'] = empty
    tmpDir = options['cache-directory']
      ? path.resolve(options['cache-directory'])
      : fs.mkdtempSync(path.join(os.tmpdir(), '.ts-node'))

    compiler.registerTsNode()

    /* clean up compiled on each new init*/
    rimraf.sync(compiler.getCompiledDir())
    compiler.createCompiledDir()
    /* check if `allowJs` compiler option enable */
    var allowJsEnabled = require.extensions['.js'] !== originalJsHandler
    if (allowJsEnabled) {
      compiler.allowJs = true
      //require.extensions['.js'] = originalJsHandler
      extensions.push('.js')
    }

    compiler.writeChildHookFile(options)
  },
  registerTsNode: function () {
    var options = compiler.options
    extensions.forEach(function (ext) {
      require.extensions[ext] = originalJsHandler
    })

    // var tsNodeOptions = {
    //   //dir: should add
    //   emit: options['emit'],
    //   files: options['files'],
    //   pretty: options['pretty'],
    //   transpileOnly: options['transpile-only'],
    //   ignore: [].concat(options['ignore']),
    //   preferTsExts: options['prefer-ts-exts'] || options['prefer-ts'],
    //   logError: options['log-error'],
    //   project: options['project'],
    //   skipProject: options['skip-project'],
    //   skipIgnore: options['skip-ignore'],
    //   compiler: options['compiler'],
    //   ignoreDiagnostics: options['ignore-diagnostics'],
    //   disableWarnings: options['disableWarnings'],
    //   compilerOptions: options['compiler-options'],
    // }
    var compilerOptionsArg =
      options['compilerOptions'] || options['compiler-options']
    var compilerOptions
    if (compilerOptionsArg) {
      try {
        compilerOptions = JSON.parse(compilerOptionsArg)
      } catch (e) {
        console.log(
          'Could not parse compilerOptions',
          options['compilerOptions']
        )
        console.log(e)
      }
    }
    let ignore = options['ignore'] || process.env['TS_NODE_IGNORE']
    if (ignore && typeof ignore === 'string') {
      ignore = [ignore]
    }

    const scriptPath = options._.length ? path.resolve(cwd, options._[0]) : undefined

    var DEFAULTS = tsNode.DEFAULTS

    try {
      compiler.service = tsNode.register({
        // --dir does not work (it gives a boolean only) so we only check for script-mode
        dir: getCwd(options['dir'], options['script-mode'], scriptPath),
        scope: options['dir'] || DEFAULTS.scope,
        emit: options['emit'] || DEFAULTS.emit,
        files: options['files'] || DEFAULTS.files,
        pretty: options['pretty'] || DEFAULTS.pretty,
        transpileOnly: options['transpile-only'] || DEFAULTS.transpileOnly,
        ignore: options['ignore']
          ? tsNode.split(options['ignore']) || options['ignore']
          : DEFAULTS.ignore,
        preferTsExts:
          options['prefer-ts-exts'] ||
          options['prefer-ts'] ||
          DEFAULTS.preferTsExts,
        logError: options['log-error'] || DEFAULTS.logError,
        project: options['project'],
        skipProject: options['skip-project'],
        skipIgnore: options['skip-ignore'],
        compiler: options['compiler'] || DEFAULTS.compiler,
        compilerHost: options['compiler-host'] || DEFAULTS.compilerHost,
        ignoreDiagnostics: options['ignore-diagnostics'],
        compilerOptions: tsNode.parse(options['compiler-options']),        
      })
    } catch (e) {
      console.log(e)
      return
    }
    extensions.forEach(function (ext) {
      extHandlers[ext] = require.extensions[ext]
      require.extensions[ext] = originalJsHandler
    })
  },
  compileChanged: function (fileName) {
    var ext = path.extname(fileName)
    if (extensions.indexOf(ext) < 0) return
    try {
      var code = fs.readFileSync(fileName, 'utf-8')
      compiler.compile({
        code: code,
        compile: fileName,
        compiledPath: getCompiledPath(
          code,
          fileName,
          compiler.getCompiledDir()
        ),
      })
    } catch (e) {
      console.error(e)
    }
  },
  compile: function (params) {
    var fileName = params.compile
    var code = fs.readFileSync(fileName, 'utf-8')
    var compiledPath = params.compiledPath
    function writeCompiled(code, filename) {
      fs.writeFileSync(compiledPath, code)
      fs.writeFileSync(compiledPath + '.done', '')
    }
    if (fs.existsSync(compiledPath)) {
      return
    }
    var starTime = new Date().getTime()
    var m = {
      _compile: writeCompiled,
    }
    const _compile = () => {
      var ext = path.extname(fileName)
      var extHandler = extHandlers[ext] || require.extensions[ext]
      extHandler(m, fileName)
      m._compile(code, fileName)
      compiler.log.debug(
        fileName,
        'compiled in',
        new Date().getTime() - starTime,
        'ms'
      )
    }
    try {
      _compile()
    } catch (e) {
      console.log('Compilation error in', fileName)
      const errorCode =
        'throw ' + 'new Error(' + JSON.stringify(e.message) + ')' + ';'
      writeCompiled(errorCode)

      // reinitialize ts-node compilation to clean up state after error
      // without timeout in causes cases error not be printed out
      setTimeout(() => {
        compiler.registerTsNode()
      })

      if (!compiler.options['error-recompile']) {
        return
      }
      const timeoutMs =
        parseInt(process.env.TS_NODE_DEV_ERROR_RECOMPILE_TIMEOUT) || 5000
      const errorHandler = () => {
        clearTimeout(compiler._errorCompileTimeout)
        compiler._errorCompileTimeout = setTimeout(() => {
          try {
            _compile()
            compiler.restart(fileName)
          } catch (e) {
            compiler.registerTsNode()
            errorHandler()
          }
        }, timeoutMs)
      }

      errorHandler()
    }
  },
}

module.exports = compiler
