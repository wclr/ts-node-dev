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
    fs.watchFile(module.filename, {interval : 500}, function(cur, prev) {
      if (cur && +cur.mtime !== +prev.mtime) {
        process.exit(101);
      }
    });
  }
}

//['node', '/pathto/wrapper.js', '--option1', '--optionN', 'script', 'arg1', 'argN']
process.argv.splice(1, 1);

var arg;
for (var i=1; i < process.argv.length; i++) {
  arg = process.argv[i];
  if (!/^-/.test(arg)) {
    break;
  }
}
var main = Path.resolve(process.cwd(), arg);

/**
 * Hook into `require`.
 */
var requireJs = require.extensions['.js'];
require.extensions['.js'] = function(module, filename) {
  if (module.id == main) {
    module.id = '.';
    module.parent = null;
  }
  watch(module);
  requireJs(module, filename);
};

require(main);