var fork = require('child_process').fork;
var filewatcher = require('filewatcher');
var ipc = require('./ipc');
var resolveMain = require('./resolveMain');
var compiler = require('./compiler');
var fs = require('fs');

module.exports = function (script, scriptArgs, nodeArgs, opts) {  
  compiler.init(opts)
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
  compiler.notify = notify
  compiler.stop = stop  
  // Run ./dedupe.js as preload script
  if (cfg.dedupe) process.env.NODE_DEV_PRELOAD = __dirname + '/dedupe';

  var watcher = filewatcher({ forcePolling: opts.poll });
  var starting = false
  watcher.on('change', function (file) {
    if (file === compiler.tsConfigPath) {
      notify('Reinitializing TS compilation');
      compiler.init(opts);
    }    
    /* eslint-disable no-octal-escape */
    if (cfg.clear) process.stdout.write('\033[2J\033[H');
    notify('Restarting', file + ' has been modified');
    compiler.compileChanged(file)    
    if (starting) return
    watcher.removeAll();
    starting = true
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
    var childHookPath = compiler.getChildHookPath();
    cmd = ['-r', childHookPath].concat(cmd);
    child = fork(cmd[0], cmd.slice(1), {
      cwd: process.cwd(),
      env: process.env
    });
    starting = false
    var compileReqWatcher = filewatcher({ forcePolling: opts.poll });
    var currentCompilePath
    fs.writeFileSync(compiler.getCompileReqFilePath(), '');
    compileReqWatcher.add(compiler.getCompileReqFilePath());
    compileReqWatcher.on('change', function (file) {      
      fs.readFile(file, 'utf-8', function (err, data) {
        if (err) {
          console.log('Error reading compile request file', err)
          return
        }
        var split = data.split('\n')
        var compile = split[0]
        var compiledPath = split[1]
        if (currentCompilePath == compiledPath) return
        currentCompilePath = compiledPath
        // console.log('compileReqWatcher file change', compile);
        if (compiledPath) {
          compiler.compile({
            compile: compile,
            compiledPath: compiledPath
          })
        }
      })
    })
    child.on('message', function (message) {
      if (!message.compiledPath || currentCompilePath === message.compiledPath) return
      currentCompilePath = message.compiledPath
      compiler.compile(message)
    });
    
    child.on('exit', function (code) {
      if (!child) return
      if (!child.respawn) process.exit(code);
      child = undefined;
    });

    if (cfg.respawn) {
      child.respawn = true;
    }

    if (!compiler.tsConfigPath) {
      throw new Error('Check existance of tsconfig.json file.')
    }
    watcher.add(compiler.tsConfigPath);

    // Listen for `required` messages and watch the required file.        
    ipc.on(child, 'required', function (m) {
      var isIgnored = cfg.ignore.some(isPrefixOf(m.required)) || cfg.ignore.some(isRegExpMatch(m.required));

      if (!isIgnored && (cfg.deps === -1 || getLevel(m.required) <= cfg.deps)) {
        watcher.add(m.required);
      }
    });

    // Upon errors, display a notification and tell the child to exit.
    ipc.on(child, 'error', function (m) {
      notify(m.error, m.message, 'error');
      stop(m.willTerminate);
    });
    compiler.writeReadyFile()
  }

  function stop(willTerminate) {
    if (!child || child.stopping) {
      return
    };
    child.stopping = true
    child.respawn = true;    
    if (child.connected === undefined || child.connected === true) {
      child.disconnect();
      if (!willTerminate) child.kill('SIGTERM');
    }        
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

function isRegExpMatch(value) {
  return function (regExp) {
    return (new RegExp(regExp)).test(value);
  };
}
