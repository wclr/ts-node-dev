var fork = require('child_process').fork
  , FSWatcher = require('chokidar').FSWatcher
  , ipc = require('./ipc')
  , notify = require('./notify')
  , cfg = require('./cfg')

module.exports = function(args) {

  // The child_process
  var child

  // Find the first arg that is not an option
  for (var i=0; i < args.length; i++) {
    if (!/^-/.test(args[i])) {
      // Splice wrap.js into the argument list
      args.splice(i, 0, __dirname + '/wrap.js')
      break
    }
  }

  var watcher = new FSWatcher({ persistent: true })

  watcher.on('change', function(file) {
    if (cfg.clear) process.stdout.write('\033[2J\033[H')
    notify('Restarting', file + ' has been modified')
    watcher.close()
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
