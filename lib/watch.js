var fs = require('fs')
  , watchFileSupported = !!fs.watchFile
  , watched = {}

module.exports = function(file, onChange) {

  if (watched[file]) return

  fs.stat(file, function(err, stats) {
    if (err) return // Probably not a real filename, ignore it.
    watched[file] = true
    if (watchFileSupported) {
      try {
        fs.watchFile(file, {interval: 500, persistent: true}, function(cur, prev) {
          if (cur && +cur.mtime > +prev.mtime) {
            onChange(file)
          }
        })
        return
      }
      catch (e) {
        watchFileSupported = false
      }
    }

    // No fs.watchFile support, fall back to fs.watch *
    fs.watch(file, function(ev) {
      if (ev == 'change') {
        fs.stat(file, function(err, cur) {
          if (err) throw err
          if (cur.size !== stats.size || +cur.mtime !== +stats.mtime) {
            stats = cur
            onChange(file)
          }
        })
      }
    })

  })
}
