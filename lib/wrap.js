var path = require('path');
var childProcess = require('child_process');
var fork = childProcess.fork;
var resolve = require('resolve').sync;
var hook = require('./hook');
var ipc = require('./ipc');
var resolveMain = require('./resolveMain');

// Remove wrap.js from the argv array
process.argv.splice(1, 1);

// Resolve the location of the main script relative to cwd
var main = resolveMain(process.argv[1]);

var cfg = require('./cfg')(main);

// Set NODE_ENV to 'development' unless already set
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

if (process.env.NODE_DEV_PRELOAD) {
  require(process.env.NODE_DEV_PRELOAD);
}

// Listen SIGTERM and exit unless there is another listener
process.on('SIGTERM', function () {
  if (process.listeners('SIGTERM').length === 1) process.exit(0);
});

if (cfg.fork) {
  // Overwrite child_process.fork() so that we can hook into forked processes
  // too. We also need to relay messages about required files to the parent.
  childProcess.fork = function (modulePath, args, options) {
    var child = fork(__filename, [modulePath].concat(args), options);
    ipc.relay(child);
    return child;
  };
}

// Error handler that displays a notification and logs the stack to stderr:
var caught = false;
process.on('uncaughtException', function (err) {
  // Handle exepection only once
  if (caught) return;
  caught = true;
  // If there's a custom uncaughtException handler expect it to terminate
  // the process.
  var hasCustomHandler = process.listeners('uncaughtException').length > 1;
  var isTsError = err.message && /TypeScript/.test(err.message)
  if (!hasCustomHandler &&  !isTsError) {
    console.error(err.stack || err);
  }    
  ipc.send({
    error: isTsError ? '' : err.name || 'Error',
    message: err.message,
    willTerminate: hasCustomHandler
  });
});

// Hook into require() and notify the parent process about required files
hook(cfg, module, function (file) {
  ipc.send({ required: file });
});

// Check if a module is registered for this extension
var ext = path.extname(main).slice(1);
var mod = cfg.extensions[ext];

// Support extensions where 'require' returns a function that accepts options
if (typeof mod == 'object' && mod.name) {
  var fn = require(resolve(mod.name, { basedir: path.dirname(main) }));
  if (typeof fn == 'function' && mod.options) {
    // require returned a function, call it with options
    fn(mod.options);
  }
} else if (typeof mod == 'string') {
  require(resolve(mod, { basedir: path.dirname(main) }));
}

// Execute the wrapped script
require(main);
