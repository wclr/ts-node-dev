var child = require('child_process');
var test = require('tap').test;
var touch = require('touch');

var dir = __dirname + '/fixture';
var bin = __dirname + '/../bin/node-dev';
var msgFile = dir + '/message.js';

// Helpers
function touchFile(file) {
  return function () {
    touch.sync(file || msgFile);
  };
}

function spawn(cmd, cb) {
  var ps = child.spawn('node', [bin].concat(cmd.split(' ')), { cwd: dir });
  var out = '';
  var err = '';

  if (cb) {

    // capture stderr
    ps.stderr.on('data', function (data) {
      err += data.toString();
    });

    // invoke callback
    ps.on('exit', function (code, signal) {
      if (err) cb(err, code, signal);
    });

    ps.stdout.on('data', function (data) {
      out += data.toString();
      var ret = cb.call(ps, out);
      if (typeof ret == 'function') {
        // use the returned function as new callback
        cb = ret;
      } else if (ret && ret.exit) {
        // kill the process and invoke the given function
        ps.stdout.removeAllListeners('data');
        ps.stderr.removeAllListeners('data');
        ps.removeAllListeners('exit');
        ps.on('exit', function () { setTimeout(ret.exit, 1000); });
        ps.kill();
      }
    });
  }

  return ps;
}

function run(cmd, done) {
  spawn(cmd, function (out) {
    if (out.match(/touch message.js/)) {
      setTimeout(touchFile(), 500);
      return function (out2) {
        if (out2.match(/Restarting/)) {
          return { exit: done };
        }
      };
    }
  });
}

// Tests

test('should pass unknown args to node binary', function (t) {
  spawn('--expose_gc gc.js foo', function (out) {
    t.is(out.trim(), 'foo function');
    return { exit: t.end.bind(t) };
  });
});

test('should restart the server', function (t) {
  run('server.js', t.end.bind(t));
});

test('should restart the server twice', function (t) {
  spawn('server.js', function (out) {
    if (out.match(/touch message.js/)) {
      setTimeout(touchFile(), 500);
      return function (out2) {
        if (out2.match(/Restarting/)) {
          setTimeout(touchFile(), 500);
          return function (out3) {
            if (out3.match(/Restarting/)) {
              return { exit: t.end.bind(t) };
            }
          };
        }
      };
    }
  });
});

/*
test('should not restart the server for ignored modules', function (t) {
  var ps = spawn('server.js', function (out) {
    if (out.match(/touch message.js/)) {
      setTimeout(touchFile(ignoredFile), 500);

      var successTimeoutId = setTimeout(function () {
        ps.removeAllListeners('exit');
        ps.kill();

        t.end();
      }, 1000);

      return function () {
        clearTimeout(successTimeoutId);
        t.fail('server restarted unexpectedly');

        return { exit: t.end.bind(t) };
      };
    }
  });
});
*/

test('should restart the cluster', function (t) {
  run('cluster.js', t.end.bind(t));
});

test('should support vm functions', function (t) {
  run('vmtest.js', t.end.bind(t));
});

test('should support vm functions with missing file argument', function (t) {
  run('vmtest.js nofile', t.end.bind(t));
});

test('should support coffee-script', function (t) {
  run('server.coffee', t.end.bind(t));
});

/*
test('should restart when a file is renamed', function (t) {
  var tmp = dir + '/message.tmp';
  fs.writeFileSync(tmp, MESSAGE);
  spawn('log.js', function (out) {
    if (out.match(/touch message.js/)) {
      fs.renameSync(tmp, msgFile);
      return function (out2) {
        if (out2.match(/Restarting/)) {
          return { exit: t.end.bind(t) };
        }
      };
    }
  });
});
*/

test('should handle errors', function (t) {
  spawn('error.js', function (out) {
    if (out.match(/ERROR/)) {
      setTimeout(touchFile(), 500);
      return function (out2) {
        if (out2.match(/Restarting/)) {
          return { exit: t.end.bind(t) };
        }
      };
    }
  });
});

test('should watch if no such module', function (t) {
  spawn('noSuchModule.js', function (out) {
    t.like(out, /ERROR/);
    return { exit: t.end.bind(t) };
  });
});

test('should run async code un uncaughtException handlers', function (t) {
  spawn('uncaughtExceptionHandler.js', function (out) {
    if (out.match(/ERROR/)) {
      return function (out2) {
        if (out2.match(/async \[?ReferenceError/)) {
          return { exit: t.end.bind(t) };
        }
      };
    }
  });
});

test('should ignore caught errors', function (t) {
  spawn('catchNoSuchModule.js', function (out) {
    t.like(out, /Caught/);
    return { exit: t.end.bind(t) };
  });
});

test('should not show up in argv', function (t) {
  spawn('argv.js foo', function (out) {
    var argv = JSON.parse(out.replace(/'/g, '"'));
    t.like(argv[0], /.*?node(js|\.exe)?$/);
    t.is(argv[1], 'argv.js');
    t.is(argv[2], 'foo');
    return { exit: t.end.bind(t) };
  });
});

test('should pass through the exit code', function (t) {
  spawn('exit.js').on('exit', function (code) {
    t.is(code, 101);
    t.end();
  });
});

test('should conceal the wrapper', function (t) {
  // require.main should be main.js not wrap.js!
  spawn('main.js').on('exit', function (code) {
    t.is(code, 0);
    t.end();
  });
});

test('should relay stdin', function (t) {
  spawn('echo.js', function (out) {
    t.is(out, 'foo');
    return { exit: t.end.bind(t) };
  }).stdin.write('foo');
});

test('should kill the forked processes', function (t) {
  spawn('pid.js', function (out) {
    var pid = parseInt(out, 10);
    return { exit: function () {
      setTimeout(function () {
        try {
          process.kill(pid);
          t.fail('child must no longer run');
        } catch (e) {
          t.end();
        }
      }, 500);
    } };
  });
});

test('should set NODE_ENV', function (t) {
  spawn('env.js', function (out) {
    t.like(out, /development/);
    return { exit: t.end.bind(t) };
  });
});

test('should allow graceful shutdowns', function (t) {
  spawn('server.js', function (out) {
    if (out.match(/touch message.js/)) {
      setTimeout(touchFile(), 500);
      return function (out2) {
        if (out2.match(/exit/)) {
          return { exit: t.end.bind(t) };
        }
      };
    }
  });
});

test('should be resistant to breaking `require.extensions`', function (t) {
  spawn('modify-extensions.js', function (out) {
    t.notOk(/TypeError/.test(out));
  });
  setTimeout(t.end.bind(t), 500);
});
