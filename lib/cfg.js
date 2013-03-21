var fs = require('fs')
  , path = require('path')

function read(dir) {
  var f = path.resolve(dir, '.node-dev.json')
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {}
}

var c = read('.')
c.__proto__ = read(process.env.HOME || process.env.USERPROFILE)

module.exports = {
  vm         : c.vm !== false,
  fork       : c.fork !== false,
  notify     : c.notify !== false,
  timestamp  : c.timestamp || (c.timestamp !== false && 'HH:MM:ss'),
  clear      : !!c.clear,
  extensions : c.extensions || {
    coffee: "coffee-script",
    ls: "LiveScript"
  }
}
