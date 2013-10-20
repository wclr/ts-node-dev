var fs = require('fs')
  , stat = fs.statSync

module.exports = function(cb) {
  var watchers = {}
    , mtimes = {}

  function close() {
    for (var file in watchers) watchers[file].close()
    watchers = {}
  }

  return function add(file) {
    if (file in watchers) return
    mtimes[file] = stat(file).mtime
    watchers[file] = fs.watch(file, function(ev) {
      if (stat(file).mtime > mtimes[file]) cb.call({ close: close }, file)
    })
  }
}
