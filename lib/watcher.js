var log = require('./log')
  , fs = require('fs')

module.exports = function(cb) {
  var watchers = {}
  var polling = false

  function close() {
    for (var file in watchers) watchers[file].close()
    watchers = {}
  }

  function changed(file) {
    cb.call({ close: close }, file)
  }

  return function watch(file) {

    if (file in watchers || !fs.existsSync(file)) return

    var mtime = fs.statSync(file).mtime

    function check() {
      fs.stat(file, function(err, stat) {
        if (err || stat.mtime > mtime) changed(null, file)
      })
    }

    if (polling) {
      fs.watchFile(file, { interval: 1000 }, check)
      watchers[file] = { close: function() { fs.unwatchFile(file) }}
      return
    }

    try {
      watchers[file] = fs.watch(file, check)
    }
    catch (err) {
      if (err.code == 'EMFILE') {
        polling = true
        var watched = Object.keys(watchers)
        close()
        log.warn('node-dev ran out of file handles after watching ' + watched.length +  ' files.')
        log.warn('Falling back to polling which uses more CPU.')
        log.info('Run ulimit -n 10000 to increase the limit of open file descriptors.')
        watched.forEach(watch)
      }
    }
  }
}
