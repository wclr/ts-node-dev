var growl = require('growl')
  , path = require('path')
  , cfg = require('./cfg')
  , log = require('./log')

/**
 * Displays a desktop notification and writes a message to the console.
 */
module.exports = function(title, msg, level) {
  level = level || 'info'
  log(title || msg, level)
  if (cfg.notify) growl(msg, { title: title || 'node.js', image: icon(level) })
}

function icon(level) {
  return path.resolve(__dirname, '../icons/node_' + level + '.png')
}
