/**
 * Wrapper that hooks into `require()` to notify the parent process.
 */

var fs = require('fs');
var Path = require('path');

/**
 * This is how the argv array looks like:
 * `['node', '/path/to/wrapper.js', '--option1', '--optionN', 'script', 'arg1', 'argN']`
 * ... so we remove ourself:
 */
process.argv.splice(1, 1);

/** Find the first arg that is not an option, starting at index 1 */
var arg;
for (var i=1; i < process.argv.length; i++) {
  arg = process.argv[i];
  if (!/^-/.test(arg)) {
    break;
  }
}

/** Resolve the location of the main script relative to cwd */
var main = Path.resolve(process.cwd(), arg);

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
      /** Notify the parent process */
      process.send({watch: module.filename});
    }
    /** Invoke the original handler */
    origs[ext](module, filename);
    /** Make sure the module did not hijack the handler */
    updateHooks();
  };
}

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

/** Support for coffee-script files */
if (Path.extname(main) == '.coffee') {
  require('coffee-script');
}

/** Catch uncaught exceptions, notify the parent process and exit */
process.on('uncaughtException', function (err) {
  process.send({error: {name: err.name, message: err.message}});
  console.error(err.stack || err);
  process.exit(1);
});

/** Load the wrapped script */
require(main);
