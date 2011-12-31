var vm = require('vm');
var fs = require('fs');

var file = __dirname + '/message.js';
var str = fs.readFileSync(file, 'utf8');
vm.runInNewContext(str, {module: {}}, file);
