var fs = require('fs');
var path = require('path');

function read(dir) {
  var f = path.resolve(dir, '.node-dev.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : null;
}

function resolvePath(unresolvedPath) {
  return path.resolve(process.cwd(), unresolvedPath);
}

module.exports = function (main, opts) {

  var dir = main ? path.dirname(main) : '.';
  var c = read(dir)
    || read(process.cwd())
    || read(process.env.HOME || process.env.USERPROFILE) || {};

  // Truthy == --all-deps, false: one level of deps
  if (typeof c.deps !== 'number') c.deps = c.deps ? -1 : 1;

  if (opts) {
    // Overwrite with CLI opts ...
    if (opts.allDeps) c.deps = -1;
    if (!opts.deps) c.deps = 0;
    if (opts.dedupe) c.dedupe = true;
    if (opts.respawn) c.respawn = true;
    if (opts.notify === false) c.notify = false;
    if (opts.clear || opts.cls) c.clear = true;
  }
  
  var ignoreWatch = ([]).concat(opts && opts['ignore-watch'] || []).concat(c.ignore || []);  
  opts.debug && console.log('Ignore watch:', ignoreWatch)
  var ignore = ignoreWatch.concat(ignoreWatch.map(resolvePath));  
  return {
    vm: c.vm !== false,
    fork: c.fork !== false,
    notify: c.notify !== false,
    deps: c.deps,
    timestamp: c.timestamp || (c.timestamp !== false && 'HH:MM:ss'),
    clear: !!(c.clear),
    dedupe: !!c.dedupe,
    ignore: ignore,
    respawn: c.respawn || false,
    debug: opts.debug,
    extensions: c.extensions || {
      coffee: 'coffee-script/register',
      ls: 'LiveScript'
    }
  };
};
