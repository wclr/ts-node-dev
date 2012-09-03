var growl = require('growl')

/**
 * Logs a message to the console. The level is displayed in ANSI colors,
 * either bright red in case of an error or green otherwise.
 */
function log(msg, level) {
  var csi = level == 'error' ? '1;31' : '32'
  console.log('[\x1B[' + csi + 'm' + level.toUpperCase() + '\x1B[0m] ' + msg)
}

module.exports = function(title, msg, level) {
  level = level || 'info'
  log(title || msg, level)
  growl(msg, { title: title || 'node.js', image: __dirname + '/icons/node_' + level + '.png' })
}
