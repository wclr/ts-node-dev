var vm = require('vm');
var fs = require('fs');
var file = __dirname + '/log.js';
var str = fs.readFileSync(file, 'utf8');

vm.runInNewContext(str, { module: {}, require: require, console: console }, file);

// Listen for events to keep running
process.on('message', function () {});
