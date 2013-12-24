var fork = require('child_process').fork
  , path = require('path')
  , filewatcher = require('filewatcher')
  , ipc = require('./ipc')
  , notify = require('./notify')
  , cfg = require('./cfg')
  , log = require('./log')

/**
 * Check if `required` is in different package relative to `currentDir`
 */
function isInDifferentPackage(currentDir, required) {
  return (
      // check if `required` is in node_modules down the fs tree
      /^(\.\.\/)*node_modules/.exec(path.relative(currentDir, required)) ||
      // check if `required` is in node_modules up in fs tree
      /node_modules/.exec(path.relative(required, currentDir))
  )
}

module.exports = function(args) {

  // The child_process
  var child

  // entry point directory
  var currentDir

  // should we ignore modules in node_modules/ dir
  var ignoreNodeModules = args.indexOf('--ignore-node-modules') > -1

  // remove this option from argument list
  if (ignoreNodeModules) {
    args.splice(args.indexOf('--ignore-node-modules'), 1)
  }

  // Find the first arg that is not an option
  for (var i=0; i < args.length; i++) {
    if (!/^-/.test(args[i])) {
      currentDir = path.dirname(args[i])
      // Splice wrap.js into the argument list
      args.splice(i, 0, __dirname + '/wrap.js')
      break
    }
  }

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
    log.info('Run ulimit -n 10000 to increase the limit of open file descriptors.')
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
      if (ignoreNodeModules && isInDifferentPackage(currentDir, m.required)) {
        return
      }
      watcher.add(m.required)
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
