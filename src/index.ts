import { fork, ChildProcess } from 'child_process'
import chokidar from 'chokidar'
import fs from 'fs'
import readline from 'readline'

const kill = require('tree-kill')

import * as ipc from './ipc'
import { resolveMain } from './resolveMain'
import { Options } from './bin'
import { makeCompiler, CompileParams } from './compiler'
import { makeCfg } from './cfg'
import { makeNotify } from './notify'
import { makeLog } from './log'

const version = require('../package.json').version
const tsNodeVersion = require('ts-node').VERSION
const tsVersion = require('typescript').version
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']

export const runDev = (
  script: string,
  scriptArgs: string[],
  nodeArgs: string[],
  opts: Options
) => {
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
  let child:
    | (ChildProcess & {
        stopping?: boolean
        respawn?: boolean
      })
    | undefined

  const wrapper = resolveMain(__dirname + '/wrap.js')
  const main = resolveMain(script)
  const cfg = makeCfg(main, opts)
  const log = makeLog(cfg)
  const notify = makeNotify(cfg, log)

  // Run ./dedupe.js as preload script
  if (cfg.dedupe) process.env.NODE_DEV_PRELOAD = __dirname + '/dedupe'

  function initWatcher() {
    const watcher = chokidar.watch([], {
      usePolling: opts.poll,
      interval: parseInt(opts.interval) || undefined,
    })
    watcher.on('change', restart)

    watcher.on('fallback', function (limit) {
      log.warn(
        'node-dev ran out of file handles after watching %s files.',
        limit
      )
      log.warn('Falling back to polling which uses more CPU.')
      log.info('Run ulimit -n 10000 to increase the file descriptor limit.')
      if (cfg.deps) log.info('... or add `--no-deps` to use less file handles.')
    })
    return watcher
  }
  let watcher = initWatcher()

  let starting = false

  // Read for "rs" from command line
  if (opts.rs !== false) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    })
    rl.on('line', (line: string) => {
      if (line.trim() === 'rs') {
        restart('', true)
      }
    })
  }

  log.info(
    'ts-node-dev ver. ' +
      version +
      ' (using ts-node ver. ' +
      tsNodeVersion +
      ', typescript ver. ' +
      tsVersion +
      ')'
  )

  /**
   * Run the wrapped script.
   */
  let compileReqWatcher: chokidar.FSWatcher
  function start() {
    if (cfg.clear) process.stdout.write('\u001bc')

    for (const watched of (opts.watch || '').split(',')) {
      if (watched) watcher.add(watched)
    }

    let cmd = nodeArgs.concat(wrapper, script, scriptArgs)
    const childHookPath = compiler.getChildHookPath()
    cmd = (opts.priorNodeArgs || []).concat(['-r', childHookPath]).concat(cmd)

    log.debug('Starting child process %s', cmd.join(' '))

    child = fork(cmd[0], cmd.slice(1), {
      cwd: process.cwd(),
      env: process.env,
      detached: true,
    })

    starting = false

    if (compileReqWatcher) {
      compileReqWatcher.close()
    }

    compileReqWatcher = chokidar.watch([], {
      usePolling: opts.poll,
      interval: parseInt(opts.interval) || undefined,
    })

    let currentCompilePath: string

    fs.writeFileSync(compiler.getCompileReqFilePath(), '')
    compileReqWatcher.add(compiler.getCompileReqFilePath())
    compileReqWatcher.on('change', function (file) {
      fs.readFile(file, 'utf-8', function (err, data) {
        if (err) {
          log.error('Error reading compile request file', err)
          return
        }
        const split = data.split('\n')
        const compile = split[0]
        const compiledPath = split[1]
        if (currentCompilePath == compiledPath) return
        currentCompilePath = compiledPath

        if (compiledPath) {
          compiler.compile({
            compile: compile,
            compiledPath: compiledPath,
          })
        }
      })
    })

    child.on('message', function (message: CompileParams) {
      if (
        !message.compiledPath ||
        currentCompilePath === message.compiledPath
      ) {
        return
      }
      currentCompilePath = message.compiledPath
      compiler.compile(message)
    })

    child.on('close', (code: number, signal: string) => {
      log.debug('Child closed with code %s', code)
      if (signal) {
        log.debug(`Exiting process with signal ${signal}`)
        process.kill(process.pid, signal)
      } else {
        log.debug(`Exiting process with code ${code}`)
        process.exit(code)
      }
    })

    if (cfg.respawn) {
      child.respawn = true
    }

    if (compiler.tsConfigPath) {
      watcher.add(compiler.tsConfigPath)
    }

    // Listen for `required` messages and watch the required file.
    ipc.on(child, 'required', function (m: ipc.IPCMessage) {
      const required = m.required!
      const isIgnored =
        cfg.ignore.some(isPrefixOf(required)) ||
        cfg.ignore.some(isRegExpMatch(required))

      if (!isIgnored && (cfg.deps === -1 || getLevel(required) <= cfg.deps)) {
        log.debug(required, 'added to watcher')
        watcher.add(required)
      }
    })

    // Upon errors, display a notification and tell the child to exit.
    ipc.on(child, 'error', function (m: ipc.IPCMessage) {
      log.debug('Child error')
      notify(m.error!, m.message!, 'error')
      stop(m.willTerminate)
    })
    compiler.writeReadyFile()
  }
  const killChild = (signal: NodeJS.Signals) => {
    if (!child) return
    log.debug(`Sending ${signal} to child pid`, child.pid)
    if (opts['tree-kill']) {
      log.debug('Using tree-kill')
      kill(child.pid)
    } else {
      child.kill(signal)
    }
  }
  function stop(willTerminate?: boolean) {
    if (!child || child.stopping) {
      return
    }
    child.stopping = true
    child.respawn = true
    if (child.connected === undefined || child.connected === true) {
      log.debug('Disconnecting from child')
      child.disconnect()
      if (!willTerminate) {
      }
      killChild('SIGTERM')
    }
  }

  function restart(file: string, isManualRestart?: boolean) {
    if (file === compiler.tsConfigPath) {
      notify('Reinitializing TS compilation', '')
      compiler.init()
    }
    compiler.clearErrorCompile()

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

  signals.forEach((signal: NodeJS.Signals) =>
    process.on(signal, () => {
      log.debug(`Process got ${signal}, killing child`)
      killChild(signal)
    })
  )

  process.on('exit', () => {
    if(child) {
      child.kill()
    }
  })

  const compiler = makeCompiler(opts, {
    restart,
    log: log,
  })

  compiler.init()

  start()
}

/**
 * Returns the nesting-level of the given module.
 * Will return 0 for modules from the main package or linked modules,
 * a positive integer otherwise.
 */
function getLevel(mod: string) {
  const p = getPrefix(mod)
  return p.split('node_modules').length - 1
}

/**
 * Returns the path up to the last occurence of `node_modules` or an
 * empty string if the path does not contain a node_modules dir.
 */
function getPrefix(mod: string) {
  const n = 'node_modules'
  const i = mod.lastIndexOf(n)
  return ~i ? mod.slice(0, i + n.length) : ''
}

function isPrefixOf(value: string) {
  return function (prefix: string) {
    return value.indexOf(prefix) === 0
  }
}

function isRegExpMatch(value: string) {
  return function (regExp: string) {
    return new RegExp(regExp).test(value)
  }
}
