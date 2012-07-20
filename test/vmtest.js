var vm = require('vm')
  , fs = require('fs')
  , file = __dirname + '/message.js'
  , str = fs.readFileSync(file, 'utf8')

vm.runInNewContext(str, {module: {}}, file)
