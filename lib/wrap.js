var path = require('path')
  , child_process = require('child_process')
  , fork = child_process.fork
  , resolve = require('resolve').sync
  , hook = require('./hook')
  , ipc = require('./ipc')
  , cfg = require('./cfg')
  , cli = require('./cli')

// Remove wrap.js from the argv array
process.argv.splice(1, 1)

// Resolve the location of the main script relative to cwd
var main = cli.resolveMain(process.argv[1])

var cfg = require('./cfg')(main)

// Set NODE_ENV to 'development' unless already set
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development'

if (process.env.NODE_DEV_PRELOAD) {
  require(process.env.NODE_DEV_PRELOAD)
}

// Listen SIGTERM and exit unless there is another listener
process.on('SIGTERM', function() {
  if (process.listeners('SIGTERM').length == 1) process.exit(0)
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

// Check if a module is registered for this extension
var ext = path.extname(main).slice(1)
  , mod = cfg.extensions[ext]

if (mod) require(resolve(mod, { basedir: path.dirname(main) }))

// Execute the wrapped script
require(main)
