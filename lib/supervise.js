var fork = require('child_process').fork
  , watch = require('./watch')
  , ipc = require('./ipc')
  , notify = require('./notify')
  , clearScreen = /true|yes|on|1/i.test(process.env.NODE_DEV_CLEARSCREEN)

module.exports = function(args) {

  var child

  // Find the first arg that is not an option
  for (var i=0; i < args.length; i++) {
    if (!/^-/.test(args[i])) {
      args.splice(i, 0, __dirname + '/wrap.js')
      break
    }
  }

  function onModify(file) {
    if (clearScreen) process.stdout.write('\033[2J\033[H')
    notify('Restarting', file + ' has been modified')
    if (child) {
      child.on('exit', start)
      ipc.send({exit: true}, child)
    }
    else {
      start()
    }
  }

  function start() {
    child = fork(args[0], args.slice(1), {
      cwd: process.cwd(),
      env: process.env
    })
    .on('exit', function(code) {
      child = undefined
    })

    ipc.on(child, 'required', function(m) {
      watch(m.required, onModify)
    })

    ipc.on(child, 'error', function(m) {
      notify(m.error, m.message, 'error')
      ipc.send({exit: true}, child)
    })

  }
  start()
}
