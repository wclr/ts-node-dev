const fs = require('fs')
const getCompiledPath = require('./get-compiled-path')
const sep = require('path').sep
const join = require('path').join
const execSync = require('child_process').execSync

// These get replaced with values from compiler.js
let compilationId
let timeThreshold = 0
let allowJs = false
let compiledDir
let preferTs = false
let ignore = [/node_modules/]
let readyFile
let execCheck = false
let exitChild = false
let sourceMapSupportPath

const checkFileScript = join(__dirname, 'check-file-exists.js')

const waitForFile = function(fileName) {
  const start = new Date().getTime()
  while (true) {
    const exists = execCheck
      ? execSync(['node', checkFileScript, '"' + fileName + '"'].join(' '), {
          stdio: 'inherit'
        }) || true
      : fs.existsSync(fileName)

    if (exists) {
      return
    }
    const passed = new Date().getTime() - start
    if (timeThreshold && passed > timeThreshold) {
      throw new Error('Could not require ' + fileName)
    }
  }
}

const compile = (code, fileName) => {
  const compiledPath = getCompiledPath(code, fileName, compiledDir)
  process.send({
    compile: fileName,
    compiledPath: compiledPath
  })
  const compileRequestFile = [compiledDir, compilationId + '.req'].join(sep)
  fs.writeFileSync(compileRequestFile, [fileName, compiledPath].join('\n'))
  waitForFile(compiledPath + '.done')
  const compiled = fs.readFileSync(compiledPath, 'utf-8')
  return compiled
}

function registerExtensions(extensions) {
  extensions.forEach(function(ext) {
    const old = require.extensions[ext] || require.extensions['.js']
    require.extensions[ext] = function(m, fileName) {
      const _compile = m._compile
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
  const old = require.extensions['.js']
  if (allowJs || preferTs) {
    require.extensions['.js'] = function(m, fileName) {
      let tsCode
      let tsFileName
      if (preferTs && !isFileInNodeModules(fileName)) {
        tsFileName = fileName.replace(/\.js$/, '.ts')
        if (fs.existsSync(tsFileName)) {
          tsCode = fs.readFileSync(tsFileName, 'utf-8')
        }
      }
      const _compile = m._compile
      const isIgnored =
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
  const time = new Date().getTime()
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
