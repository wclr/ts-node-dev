var fork = require('child_process').fork;
var filewatcher = require('filewatcher');
var ipc = require('./ipc');
var resolveMain = require('./resolveMain');

module.exports = function (script, scriptArgs, nodeArgs, opts) {
  if (typeof script !== 'string' || script.length === 0) {
    throw new TypeError('`script` must be a string');
  }

  if (!Array.isArray(scriptArgs)) {
    throw new TypeError('`scriptArgs` must be an array');
  }

  if (!Array.isArray(nodeArgs)) {
    throw new TypeError('`nodeArgs` must be an array');
  }

  // The child_process
  var child;

  var wrapper = resolveMain(__dirname + '/wrap.js');
  var main = resolveMain(script);
  var cfg = require('./cfg')(main, opts);
  var log = require('./log')(cfg);
  var notify = require('./notify')(cfg, log);

  // Run ./dedupe.js as preload script
  if (cfg.dedupe) process.env.NODE_DEV_PRELOAD = __dirname + '/dedupe';

  var watcher = filewatcher({ forcePolling: opts.poll });

  watcher.on('change', function (file) {
    /* eslint-disable no-octal-escape */
    if (cfg.clear) process.stdout.write('\033[2J\033[H');
    notify('Restarting', file + ' has been modified');
    watcher.removeAll();
    if (child) {
      // Child is still running, restart upon exit
      child.on('exit', start);
      stop();
    } else {
      // Child is already stopped, probably due to a previous error
      start();
    }
  });

  watcher.on('fallback', function (limit) {
    log.warn('node-dev ran out of file handles after watching %s files.', limit);
    log.warn('Falling back to polling which uses more CPU.');
    log.info('Run ulimit -n 10000 to increase the file descriptor limit.');
    if (cfg.deps) log.info('... or add `--no-deps` to use less file handles.');
  });

  /**
   * Run the wrapped script.
   */
  function start() {
    var cmd = nodeArgs.concat(wrapper, script, scriptArgs);
    child = fork(cmd[0], cmd.slice(1), {
      cwd: process.cwd(),
      env: process.env
    });

    if (cfg.respawn) {
      child.respawn = true;
    }
    child.on('exit', function (code) {
      if (!child.respawn) process.exit(code);
      child = undefined;
    });

    // Listen for `required` messages and watch the required file.
    ipc.on(child, 'required', function (m) {
      var isIgnored = cfg.ignore.some(isPrefixOf(m.required));

      if (!isIgnored && (cfg.deps === -1 || getLevel(m.required) <= cfg.deps)) {
        watcher.add(m.required);
      }
    });

    // Upon errors, display a notification and tell the child to exit.
    ipc.on(child, 'error', function (m) {
      notify(m.error, m.message, 'error');
      stop(m.willTerminate);
    });
  }

  function stop(willTerminate) {
    child.respawn = true;
    child.disconnect();
    if (!willTerminate) child.kill('SIGTERM');
  }

  // Relay SIGTERM
  process.on('SIGTERM', function () {
    if (child) child.kill('SIGTERM');
    process.exit(0);
  });

  start();
};

/**
 * Returns the nesting-level of the given module.
 * Will return 0 for modules from the main package or linked modules,
 * a positive integer otherwise.
 */
function getLevel(mod) {
  var p = getPrefix(mod);
  return p.split('node_modules').length - 1;
}

/**
 * Returns the path up to the last occurence of `node_modules` or an
 * empty string if the path does not contain a node_modules dir.
 */
function getPrefix(mod) {
  var n = 'node_modules';
  var i = mod.lastIndexOf(n);
  return ~i ? mod.slice(0, i + n.length) : '';
}

function isPrefixOf(value) {
  return function (prefix) {
    return value.indexOf(prefix) === 0;
  };
}
