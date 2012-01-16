/**
 * Hooks into `require()` to watch for modifications of required files.
 * If a modification is detected, the process exits with code `101`.
 */
var fs = require('fs');
var Path = require('path');
var vm = require('vm');
var spawn = require('child_process').spawn;

/** Remove wrapper.js from the argv array */
process.argv.splice(1, 1);

/** Resolve the location of the main script relative to cwd */
var main = Path.resolve(process.cwd(), process.argv[1]);

/**
 * Logs a message to the console. The level is displayed in ANSI colors,
 * either bright red in case of an error or green otherwise.
 */
function log(msg, level) {
  var csi = level == 'error' ? '1;31' : '32';
  console.log('[\x1B[' + csi + 'm' + level.toUpperCase() + '\x1B[0m] ' + msg);
}

/**
 * Displays a desktop notification (see notify.sh)
 */
function notify(title, msg, level) {
  level = level || 'info';
  log(title || msg, level);
  spawn(__dirname + '/notify.sh', [
    title || 'node.js',
    msg,
    __dirname + '/icons/node_' + level + '.png'
  ]);
}

/**
 * Triggers a restart by terminating the process with a special exit code.
 */
function triggerRestart() {
  process.removeListener('exit', checkExitCode);
  process.exit(101);
}

/**
 * Sanity check to prevent an infinite loop in case the program
 * calls `process.exit(101)`.
 */
function checkExitCode(code) {
  if (code == 101) {
    notify('Invalid Exit Code', 'The exit code (101) has been rewritten to prevent an infinite loop.', 'error');
    process.reallyExit(1);
  }
}

/**
 * Watches the specified file and triggers a restart upon modification.
 */
function watch(file) {
  fs.watchFile(file, {interval: 500, persistent: true}, function(cur, prev) {
    if (cur && +cur.mtime !== +prev.mtime) {
      notify('Restarting', file + ' has been modified');
      triggerRestart();
    }
  });
}

var origs = {};
var hooks = {};

function createHook(ext) {
  return function(module, filename) {
    if (module.id == main) {
      /** If the main module is required conceal the wrapper */
      module.id = '.';
      module.parent = null;
      process.mainModule = module;
    }
    if (!module.loaded) {
      watch(module.filename);
    }
    /** Invoke the original handler */
    origs[ext](module, filename);

    /** Make sure the module did not hijack the handler */
    updateHooks();
  };
}

/**
 * (Re-)installs hooks for all registered file extensions.
 */
function updateHooks() {
  var handlers = require.extensions;
  for (var ext in handlers) {
    // Get or create the hook for the extension
    var hook = hooks[ext] || (hooks[ext] = createHook(ext));
    if (handlers[ext] !== hook) {
      // Save a reference to the original handler
      origs[ext] = handlers[ext];
      // and replace the handler by our hook
      handlers[ext] = hook;
    }
  }
}
updateHooks();

/**
 * Patches the specified method to watch the file at the given argument
 * index.
 */
function patch(obj, method, fileArgIndex) {
  var orig = obj[method];
  obj[method] = function() {
    var file = arguments[fileArgIndex];
    if (file) {
      watch(file);
    }
    return orig.apply(this, arguments);
  };
}

/** Patch the vm module to watch files executed via one of these methods: */
patch (vm, 'createScript', 1);
patch(vm, 'runInThisContext', 1);
patch(vm, 'runInNewContext', 2);
patch(vm, 'runInContext', 2);

/**
 * Error handler that displays a notification and logs the stack to stderr.
 */
process.on('uncaughtException', function(err) {
 notify(err.name, err.message, 'error');
 console.error(err.stack || err);
});

process.on('exit', checkExitCode);

if (Path.extname(main) == '.coffee') {
  require('coffee-script');
}

require(main);
