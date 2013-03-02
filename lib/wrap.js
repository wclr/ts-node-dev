var path = require('path')
  , child_process = require('child_process')
  , fork = child_process.fork
  , hook = require('./hook')
  , ipc = require('./ipc')
  , cfg = require('./cfg')

// Remove wrap.js from the argv array
process.argv.splice(1, 1)

// Listen for exit messages from the parent process
ipc.on(process, 'exit', function() {
  process.exit()
})

if (cfg.fork) {
  // Overwrite child_process.fork() so that we can hook into forked processes
  // too. We also need to relay messages about required files to the parent.
  child_process.fork = function(modulePath, args, options) {
    var child = fork(__filename, [modulePath].concat(args), options)
    ipc.relay(child)
    return child
  }
}

// Error handler that displays a notification and logs the stack to stderr:
process.on('uncaughtException', function(err) {
 ipc.send({error: err.name, message: err.message})
 console.error(err.stack || err)
})

// Hook into require() and notify the parent process about required files
hook(module, function(file) {
  ipc.send({required: file})
})

// Resolve the location of the main script relative to cwd
var main = path.resolve(process.cwd(), process.argv[1])

// Check if a module is registered for this extension
var ext = path.extname(main).slice(1)
  , mod = cfg.extensions[ext]

if (mod) require(mod)

// Execute the wrapped script
require(main)
