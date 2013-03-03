var vm = require('vm')
  , fs = require('fs')
  , file = __dirname + '/log.js'
  , str = fs.readFileSync(file, 'utf8')

vm.runInNewContext(str, {module: {}, require: require, console: console}, file)
