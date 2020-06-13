var fork = require('child_process').fork
var chokidar = require('chokidar')
var ipc = require('./ipc')
var resolveMain = require('./resolveMain')
var compiler = require('./compiler')
var fs = require('fs')
var tsNodeVersion = require('ts-node').VERSION
var tsVersion = require('typescript').version
var kill = require('tree-kill')
var readline = require('readline')

module.exports = function(script, scriptArgs, nodeArgs, opts) {
  if (typeof script !== 'string' || script.length === 0) {
    throw new TypeError('`script` must be a string')
  }

  if (!Array.isArray(scriptArgs)) {
    throw new TypeError('`scriptArgs` must be an array')
  }

  if (!Array.isArray(nodeArgs)) {
    throw new TypeError('`nodeArgs` must be an array')
  }

  // The child_process
  var child

  var wrapper = resolveMain(__dirname + '/wrap.js')
  var main = resolveMain(script)
  var cfg = require('./cfg')(main, opts)
  var log = require('./log')(cfg)
  var notify = require('./notify')(cfg, log)
  opts.log = log
  compiler.init(opts)

  compiler.notify = notify
  compiler.stop = stop
  // Run ./dedupe.js as preload script
  if (cfg.dedupe) process.env.NODE_DEV_PRELOAD = __dirname + '/dedupe'

  // var watcher = filewatcher({
  //   forcePolling: opts.poll,
  //   interval: parseInt(opts.interval),
  //   debounce: parseInt(opts.debounce),
  //   recursive: process.platform !== 'linux'
  // })
  
  function initWatcher () {
    var watcher = chokidar.watch([], {
      usePolling: opts.poll,
      interval: parseInt(opts.interval) || undefined,
          
    })
    watcher.on('change', restart)

    watcher.on('fallback', function(limit) {
      log.warn('node-dev ran out of file handles after watching %s files.', limit)
      log.warn('Falling back to polling which uses more CPU.')
      log.info('Run ulimit -n 10000 to increase the file descriptor limit.')
      if (cfg.deps) log.info('... or add `--no-deps` to use less file handles.')
    })
    return watcher
  }
  var watcher = initWatcher()
  
  var starting = false
  
  // Read for "rs" from command line
  if (opts.rs !== false) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    })
    rl.on('line', function(line) {      
      if (line.trim() === 'rs') {
        restart('', true)
      }
    })
  }

  /**
   * Run the wrapped script.
   */
  var compileReqWatcher
  function start() {
    console.log(
      'Using ts-node version',
      tsNodeVersion + ', typescript version',
      tsVersion
    )
    for (let watched of (opts.watch || '').split(',')) {
      if (watched) watcher.add(watched)
    }
    var cmd = nodeArgs.concat(wrapper, script, scriptArgs)
    var childHookPath = compiler.getChildHookPath()

    cmd = (opts.priorNodeArgs || []).concat(['-r', childHookPath]).concat(cmd)
    log.debug('Starting child process %s', cmd.join(' '))
    child = fork(cmd[0], cmd.slice(1), {
      cwd: process.cwd(),
      env: process.env
    })
    starting = false
    //var compileReqWatcher = filewatcher({ forcePolling: opts.poll })
    if (compileReqWatcher) {
      compileReqWatcher.close()
    }    
    compileReqWatcher = chokidar.watch([], {
      usePolling: opts.poll,
      interval: parseInt(opts.interval) || undefined
    })
    var currentCompilePath
    fs.writeFileSync(compiler.getCompileReqFilePath(), '')
    compileReqWatcher.add(compiler.getCompileReqFilePath())
    compileReqWatcher.on('change', function(file) {
      fs.readFile(file, 'utf-8', function(err, data) {
        if (err) {
          log.error('Error reading compile request file', err)
          return
        }
        var split = data.split('\n')
        var compile = split[0]
        var compiledPath = split[1]
        if (currentCompilePath == compiledPath) return
        currentCompilePath = compiledPath
        // console.log('compileReqWatcher file change', compile);
        if (compiledPath) {
          compiler.compile({
            compile: compile,
            compiledPath: compiledPath
          })
        }
      })
    })
    child.on('message', function(message) {
      if (!message.compiledPath || currentCompilePath === message.compiledPath)
        return
      currentCompilePath = message.compiledPath
      compiler.compile(message)
    })

    child.on('exit', function(code) {
      log.debug('Child exited with code %s', code)
      if (!child) return
      if (!child.respawn) process.exit(code)
      child = undefined
    })

    if (cfg.respawn) {
      child.respawn = true
    }

    if (compiler.tsConfigPath) {
      watcher.add(compiler.tsConfigPath)
    }

    // Listen for `required` messages and watch the required file.
    ipc.on(child, 'required', function(m) {
      var isIgnored =
        cfg.ignore.some(isPrefixOf(m.required)) ||
        cfg.ignore.some(isRegExpMatch(m.required))

      if (!isIgnored && (cfg.deps === -1 || getLevel(m.required) <= cfg.deps)) {
        watcher.add(m.required)
      }
    })

    // Upon errors, display a notification and tell the child to exit.
    ipc.on(child, 'error', function(m) {
      log.debug('Child error')
      notify(m.error, m.message, 'error')
      stop(m.willTerminate)
    })
    compiler.writeReadyFile()
  }
  const killChild = () => {
    if (!child) return
    log.debug('Sending SIGTERM kill to child pid', child.pid)
    if (opts['tree-kill']) {
      log.debug('Using tree-kill')
      kill(child.pid)
    } else {
      child.kill('SIGTERM')
    }
  }
  function stop(willTerminate) {
    if (!child || child.stopping) {
      return
    }
    child.stopping = true
    child.respawn = true
    if (child.connected === undefined || child.connected === true) {
      log.debug('Disconnecting from child')
      child.disconnect()
      //if (!willTerminate) {
        killChild()
      //}
    }
  }

  function restart(file, isManualRestart) {
    if (file === compiler.tsConfigPath) {
      notify('Reinitializing TS compilation')
      compiler.init(opts)
    }
    compiler.clearErrorCompile()
    /* eslint-disable no-octal-escape */
    if (cfg.clear) process.stdout.write('\033[2J\033[H')
    if (isManualRestart === true) {
      notify('Restarting', 'manual restart from user')
    } else {
      notify('Restarting', file + ' has been modified')
    }
    compiler.compileChanged(file)
    if (starting) {
      log.debug('Already starting')
      return
    }
    log.debug('Removing all watchers from files')
    //watcher.removeAll()ya
    
    watcher.close()
    watcher = initWatcher()
    starting = true
    if (child) {
      log.debug('Child is still running, restart upon exit')
      child.on('exit', start)
      stop()
    } else {
      log.debug('Child is already stopped, probably due to a previous error')
      start()
    }
  }
  compiler.restart = restart

  // Relay SIGTERM
  process.on('SIGTERM', function() {
    log.debug('Process got SIGTERM')
    killChild()
    if (opts['restart-terminated']) {
      var timeout = opts['restart-terminated'] || 0
      log.info('Restarting terminated in ' + timeout + ' seconds')
      setTimeout(() => {        
        start()
      }, timeout)
    } else {
      process.exit(0)
    }    
  })

  start()
}

/**
 * Returns the nesting-level of the given module.
 * Will return 0 for modules from the main package or linked modules,
 * a positive integer otherwise.
 */
function getLevel(mod) {
  var p = getPrefix(mod)
  return p.split('node_modules').length - 1
}

/**
 * Returns the path up to the last occurence of `node_modules` or an
 * empty string if the path does not contain a node_modules dir.
 */
function getPrefix(mod) {
  var n = 'node_modules'
  var i = mod.lastIndexOf(n)
  return ~i ? mod.slice(0, i + n.length) : ''
}

function isPrefixOf(value) {
  return function(prefix) {
    return value.indexOf(prefix) === 0
  }
}

function isRegExpMatch(value) {
  return function(regExp) {
    return new RegExp(regExp).test(value)
  }
}
