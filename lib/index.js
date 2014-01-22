var fork = require('child_process').fork
  , path = require('path')
  , filewatcher = require('filewatcher')
  , ipc = require('./ipc')
  , notify = require('./notify')
  , cfg = require('./cfg')
  , cli = require('./cli')
  , log = require('./log')

module.exports = function(args) {

  // The child_process
  var child

  // Parse command line options
  var opts = cli.parseOpts(args, cfg)

  // Inject wrap.js into the args array
  cli.injectScript(args, __dirname + '/wrap.js')

  // The prefix of the main module
  var mainPrefix = getPrefix(path.resolve(args[1]))

  var watcher = filewatcher()

  watcher.on('change', function(file) {
    if (cfg.clear) process.stdout.write('\033[2J\033[H')
    notify('Restarting', file + ' has been modified')
    watcher.removeAll()
    if (child) {
      // Child is still running, restart upon exit
      child.on('exit', start)
      stop()
    }
    else {
      // Child is already stopped, probably due to a previous error
      start()
    }
  })

  watcher.on('fallback', function(limit) {
    log.warn('node-dev ran out of file handles after watching %s files.', limit)
    log.warn('Falling back to polling which uses more CPU.')
    log.info('Run ulimit -n 10000 to increase the file descriptor limit.')
    if (opts.deps) log.info('... or add `--no-deps` to use less file handles.')
  })

  /**
   * Run the wrapped script.
   */
  function start() {
    child = fork(args[0], args.slice(1), {
      cwd: process.cwd(),
      env: process.env
    })
    .on('exit', function(code) {
      if (!child.respawn) process.exit(code)
      child = undefined
    })

    // Listen for `required` messages and watch the required file.
    ipc.on(child, 'required', function(m) {
      if (opts.deps || getPrefix(m.required) == mainPrefix) {
        watcher.add(m.required)
      }
    })

    // Upon errors, display a notification and tell the child to exit.
    ipc.on(child, 'error', function(m) {
      notify(m.error, m.message, 'error')
      stop()
    })
  }

  function stop() {
    child.respawn = true
    ipc.send({exit: true}, child)
  }

  // Relay SIGTERM
  process.on('SIGTERM', function() {
    if (child) child.kill('SIGTERM')
    process.exit(0)
  })

  start()
}


/**
 * Returns the path up to the last occurence of `node_modules` or an
 * empty string if the path does not contain a node_modules dir.
 */
function getPrefix(mod) {
  var i = mod.lastIndexOf('node_modules')
  return ~i ? mod.slice(0, i) : ''
}
