const path = require('path');
const childProcess = require('child_process');
const fork = childProcess.fork;
const resolve = require('resolve').sync;
const hook = require('./hook');
const ipc = require('./ipc');
const resolveMain = require('./resolveMain');

// Remove wrap.js from the argv array
process.argv.splice(1, 1);

// Resolve the location of the main script relative to cwd
const main = resolveMain(process.argv[1]);

const cfg = require('./cfg')(main, {});

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
    const child = fork(__filename, [modulePath].concat(args), options);
    ipc.relay(child);
    return child;
  };
}

// Error handler that displays a notification and logs the stack to stderr:
let caught = false;
process.on('uncaughtException', function (err) {
  // Handle exepection only once
  if (caught) return;
  caught = true;
  // If there's a custom uncaughtException handler expect it to terminate
  // the process.
  const hasCustomHandler = process.listeners('uncaughtException').length > 1;
  const isTsError = err.message && /TypeScript/.test(err.message)
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
const ext = path.extname(main).slice(1);
const mod = cfg.extensions[ext];

// Support extensions where 'require' returns a function that accepts options
if (typeof mod == 'object' && mod.name) {
  const fn = require(resolve(mod.name, { basedir: path.dirname(main) }));
  if (typeof fn == 'function' && mod.options) {
    // require returned a function, call it with options
    fn(mod.options);
  }
} else if (typeof mod == 'string') {
  require(resolve(mod, { basedir: path.dirname(main) }));
}

// Execute the wrapped script
require(main);
