/**
 * Hooks into `require()` to watch for modifications of the required
 * file. If a modification is detected, the process exits with code
 * `101`.
 */

/**
 * Module dependencies.
 */
var fs = require('fs');
var Path = require('path');

/**
 * Watches the given module's filename.
 */
function watch(module) {
  if (!module.loaded) {
    fs.watchFile(module.filename, {interval : 500, persistent: false}, function(cur, prev) {
      if (cur && +cur.mtime !== +prev.mtime) {
        process.exit(101);
      }
    });
  }
}

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

if (Path.extname(main) == '.coffee') {
  require('coffee-script');
}

/** Hook into `require()` */
function hookInto(ext) {
  var extensionHandler = require.extensions[ext];
  require.extensions[ext] = function(module, filename) {
    if (module.id == main) {
      module.id = '.';
      module.parent = null;
      process.mainModule = module;
    }
    watch(module);
    extensionHandler(module, filename);
    if (ext == '.js' && Path.basename(filename, ext) == 'coffee-script') {
      hookInto('.coffee');
    }
  };
}

hookInto('.js');

/** Load the wrapped script */
require(main);