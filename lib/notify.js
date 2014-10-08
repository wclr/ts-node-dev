var notifier = require('node-notifier')
  , path = require('path')
  , cfg = require('./cfg')
  , log = require('./log')

/**
 * Displays a desktop notification and writes a message to the console.
 */
module.exports = function(title, msg, level) {
  level = level || 'info'
  log(title || msg, level)
  if (cfg.notify) notifier.notify({ title: title || 'node.js', image: icon(level), message: msg })
}

function icon(level) {
  return path.resolve(__dirname, '../icons/node_' + level + '.png')
}
