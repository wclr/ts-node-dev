import * as tsNode from 'ts-node'

import fs from 'fs'
import path from 'path'
import os, { type } from 'os'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import { resolveSync } from 'tsconfig'
import { Options } from './bin'
import { getCompiledPath } from './get-compiled-path'

const fixPath = (p: string) => p.replace(/\\/g, '/').replace(/\$/g, '$$$$')

const sourceMapSupportPath = require.resolve('source-map-support')

const extensions = ['.ts', '.tsx']
const empty = function () {}
const cwd = process.cwd()
const compilationInstanceStamp = Math.random().toString().slice(2)

const originalJsHandler = require.extensions['.js']

// const extHandlers = {}

function hasOwnProperty(object: any, property: string) {
  return Object.prototype.hasOwnProperty.call(object, property)
}

function getCwd(dir: string, scriptMode: boolean, scriptPath?: string) {
  if (scriptMode) {
    if (!scriptPath) {
      console.error(
        'Script mode must be used with a script name, e.g. `ts-node-dev -s <script.ts>`'
      )
      process.exit()
    }

    if (dir) {
      console.error('Script mode cannot be combined with `--dir`')
      process.exit()
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
      if (!hasOwnProperty(require.extensions, ext)) {
        // tslint:disable-line
        extsTemporarilyInstalled.push(ext)
        require.extensions[ext] = function () {} // tslint:disable-line
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

export type CompileParams = {
  code?: string
  compile: string
  compiledPath: string
}

export const makeCompiler = (
  options: Options,
  {
    log,
    restart,
  }: {
    log: Function & { debug: Function }
    stop: Function
    notify: Function
    restart: (fileName: string) => void
  }
) => {
  let service: tsNode.Register
  let _errorCompileTimeout: ReturnType<typeof setTimeout>
  let allowJs = false

  const project = options['project']
  const tsConfigPath =
    resolveSync(cwd, typeof project === 'string' ? project : undefined) || ''

  const tmpDir = options['cache-directory']
    ? path.resolve(options['cache-directory'])
    : fs.mkdtempSync(path.join(os.tmpdir(), '.ts-node'))

  const init = () => {
    //const originalJsHandler = require.extensions['.js']
    require.extensions['.ts'] = empty
    require.extensions['.tsx'] = empty

    compiler.registerTsNode()

    /* clean up compiled on each new init*/
    rimraf.sync(compiler.getCompiledDir())
    compiler.createCompiledDir()

    // check if `allowJs` compiler option enable
    // (if it was changed after ts-node registration)
    const allowJsEnabled = require.extensions['.js'] !== originalJsHandler
    if (allowJsEnabled) {
      allowJs = true
      //require.extensions['.js'] = originalJsHandler
      extensions.push('.js')
    }

    compiler.writeChildHookFile(options)
  }

  const compiler = {
    tsConfigPath,
    init,
    getCompilationId: function () {
      return compilationInstanceStamp
    },
    createCompiledDir: function () {
      const compiledDir = compiler.getCompiledDir()
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
        .join(
          os.tmpdir(),
          'ts-node-dev-hook-' + compilationInstanceStamp + '.js'
        )
        .replace(/\\/g, '/')
    },
    writeReadyFile: function () {
      const fileData = fs.writeFileSync(compiler.getCompilerReadyFilePath(), '')
    },
    writeChildHookFile: function (options: Options) {
      const compileTimeout = parseInt(options['compile-timeout'])

      const getIgnoreVal = (ignore: string) => {
        const ignoreVal =
          !ignore || ignore === 'false'
            ? 'false'
            : '[' +
              ignore
                .split(/,/)
                .map((i) => i.trim())
                .map((ignore) => 'new RegExp("' + ignore + '")')
                .join(', ') +
              ']'
        return ignoreVal
      }

      const varDecl = (name: string, value: string) =>
        `var ${name} = '${value}'`

      const replacements: string[][] = [
        compileTimeout ? ['10000', compileTimeout.toString()] : null,
        allowJs ? ['allowJs = false', 'allowJs = true'] : null,
        options['prefer-ts-exts']
          ? ['preferTs = false', 'preferTs = true']
          : null,
        options['exec-check']
          ? ['execCheck = false', 'execCheck = true']
          : null,
        options['exit-child']
          ? ['exitChild = false', 'exitChild = true']
          : null,
        options['ignore'] !== undefined
          ? [
              'var ignore = [/node_modules/]',
              'var ignore = ' + getIgnoreVal(options['ignore']),
            ]
          : null,
        [
          varDecl('compilationId', ''),
          varDecl('compilationId', compiler.getCompilationId()),
        ],
        [
          varDecl('compiledDir', ''),
          varDecl('compiledDir', compiler.getCompiledDir()),
        ],
        [
          './get-compiled-path',
          fixPath(path.join(__dirname, 'get-compiled-path')),
        ],
        [
          varDecl('readyFile', ''),
          varDecl('readyFile', compiler.getCompilerReadyFilePath()),
        ],
        [
          varDecl('sourceMapSupportPath', ''),
          varDecl('sourceMapSupportPath', fixPath(sourceMapSupportPath)),
        ],
        [
          varDecl('libPath', ''),
          varDecl('libPath', __dirname.replace(/\\/g, '\\\\')),
        ],
        ['__dirname', '"' + fixPath(__dirname) + '"'],
      ]
        .filter((_) => !!_)
        .map((_) => _!)

      const fileText = fs.readFileSync(
        path.join(__dirname, 'child-require-hook.js'),
        'utf-8'
      )

      const fileData = replacements.reduce((text, [what, to]) => {
        return text.replace(what, to)
      }, fileText)

      fs.writeFileSync(compiler.getChildHookPath(), fileData)
    },
    clearErrorCompile: () => {
      clearTimeout(_errorCompileTimeout)
    },
    registerTsNode: function () {
      // revert back original handler extensions
      // in case of re-registering

      ;['.js', '.jsx', '.ts', '.tsx'].forEach(function (ext) {
        require.extensions[ext] = originalJsHandler
      })

      const scriptPath = options._.length
        ? path.resolve(cwd, options._[0])
        : undefined

      const DEFAULTS = tsNode.DEFAULTS

      service = tsNode.register({
        // --dir does not work (it gives a boolean only) so we only check for script-mode
        dir: getCwd(options['dir'], options['script-mode'], scriptPath),
        scope: options['scope'] || DEFAULTS.scope,
        emit: options['emit'] || DEFAULTS.emit,
        files: options['files'] || DEFAULTS.files,
        pretty: options['pretty'] || DEFAULTS.pretty,
        transpileOnly: options['transpile-only'] || DEFAULTS.transpileOnly,
        ignore: options['ignore']
          ? tsNode.split(options['ignore'])
          : DEFAULTS.ignore,
        preferTsExts: options['prefer-ts-exts'] || DEFAULTS.preferTsExts,
        logError: options['log-error'] || DEFAULTS.logError,
        project: options['project'],
        skipProject: options['skip-project'],
        skipIgnore: options['skip-ignore'],
        compiler: options['compiler'] || DEFAULTS.compiler,
        compilerHost: options['compiler-host'] || DEFAULTS.compilerHost,
        ignoreDiagnostics: options['ignore-diagnostics']
          ? tsNode.split(options['ignore-diagnostics'])
          : DEFAULTS.ignoreDiagnostics,
        compilerOptions: tsNode.parse(options['compiler-options']),
      })
    },
    compileChanged: function (fileName: string) {
      const ext = path.extname(fileName)
      if (extensions.indexOf(ext) < 0) return
      try {
        const code = fs.readFileSync(fileName, 'utf-8')
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
    compile: function (params: CompileParams) {
      const fileName = params.compile
      const code = fs.readFileSync(fileName, 'utf-8')
      const compiledPath = params.compiledPath
      function writeCompiled(code: string, fileName?: string) {
        fs.writeFileSync(compiledPath, code)
        fs.writeFileSync(compiledPath + '.done', '')
      }
      if (fs.existsSync(compiledPath)) {
        return
      }
      const starTime = new Date().getTime()
      const m: any = {
        _compile: writeCompiled,
      }
      const _compile = () => {
        const ext = path.extname(fileName)
        const extHandler = require.extensions[ext]!

        extHandler(m, fileName)
        m._compile(code, fileName)
        log.debug(
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
        }, 0)

        if (!options['error-recompile']) {
          return
        }
        const timeoutMs =
          parseInt(process.env.TS_NODE_DEV_ERROR_RECOMPILE_TIMEOUT || '0') ||
          5000
        const errorHandler = () => {
          clearTimeout(_errorCompileTimeout)
          _errorCompileTimeout = setTimeout(() => {
            try {
              _compile()
              restart(fileName)
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

  return compiler
}
