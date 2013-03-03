var growl = require('growl')
  , fmt = require('dateformat')
  , path = require('path')
  , cfg = require('./cfg')

/**
 * Displays a desktop notification and writes a message to the console.
 */
module.exports = function(title, msg, level) {
  level = level || 'info'
  log(title || msg, level)
  if (cfg.notify) growl(msg, { title: title || 'node.js', image: icon(level) })
}

/**
 * Logs a message to the console. The level is displayed in ANSI colors,
 * either bright red in case of an error or green otherwise.
 */
function log(msg, level) {
  if (cfg.timestamp) msg = color(fmt(cfg.timestamp), '30;1') + ' ' + msg
  var c = level == 'error' ? '31;1' : '32'
  console.log('[' + color(level.toUpperCase(), c) +'] ' + msg)
}

function color(s, c) {
  return '\x1B[' + c + 'm' + s + '\x1B[0m'
}

function icon(level) {
  return path.resolve(__dirname, '../icons/node_' + level + '.png')
}
