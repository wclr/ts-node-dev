var Path = require('path')
  , child_process = require('child_process')
  , fork = child_process.fork
  , hook = require('./hook')
  , ipc = require('./ipc')

// Remove wrap.js from the argv array
process.argv.splice(1, 1)

ipc.on(process, 'exit', function() {
  process.exit()
})

// Overwrite child_process.fork() so that we can hook into forked processes too.
// Additionally we need to relay messages about required files to the parent.
child_process.fork = function(modulePath, args, options) {
  var child = fork(__filename, [modulePath].concat(args), options)
  ipc.relay(child)
  return child
}

// Error handler that displays a notification and logs the stack to stderr:
process.on('uncaughtException', function(err) {
 ipc.send({error: err.name, message: err.message})
 console.error(err.stack || err)
})

// Hook into require() and notify the pratent process about required files
hook(module, function(file) {
  ipc.send({required: file})
})

// Resolve the location of the main script relative to cwd
var main = Path.resolve(process.cwd(), process.argv[1])

require(main)
