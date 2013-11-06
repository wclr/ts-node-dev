var log = require('./log')
  , fs = require('fs')
  , stat = fs.statSync

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

    if (file in watchers) return

    var mtime = stat(file).mtime

    function check() {
      if (stat(file).mtime > mtime) changed(null, file)
    }

    if (polling) {
      fs.watchFile(file, check)
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
