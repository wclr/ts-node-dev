/**
 * Hooks into `require()` to watch for modifications of the required
 * file. If a modification is detected, the process exits with code
 * `101`.
 * If the process wasn't spawned by the `node-dev` binary the module
 * does nothing, hence it's safe require it even in production.
 */

/**
 * Module dependencies.
 */
var fs = require('fs');

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

/**
 * Test if the process was started as `node-dev`. Will only work in
 * bash-like shells that set `$_`.
 */
if (/node-dev$/.test(process.env._)) {

  /**
   * Watch this module's ancestors.
   */
  var m = module;
  while ((m = m.parent)) {
    watch(m);
  }

  /**
   * Hook into `require`.
   */
  var requireJs = require.extensions['.js'];
  require.extensions['.js'] = function(module, filename) {
    watch(module);
    requireJs(module, filename);
  };
}