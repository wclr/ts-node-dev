var cfg = require('./cfg')
  , util = require('util')
  , fmt = require('dateformat')

/**
 * Logs a message to the console. The level is displayed in ANSI colors,
 * either bright red in case of an error or green otherwise.
 */
module.exports = exports = log

var colors = {
  info: '36',
  error: '31;1',
  warn: '33'
}

function log(msg, level) {
  if (cfg.timestamp) msg = color(fmt(cfg.timestamp), '30;1') + ' ' + msg
  var c = colors[level.toLowerCase()] || '32'
  console.log('[' + color(level.toUpperCase(), c) +'] ' + msg)
}

function color(s, c) {
  return '\x1B[' + c + 'm' + s + '\x1B[0m'
}

exports.info = function() {
  log(util.format.apply(util, arguments), 'info')
}

exports.warn = function() {
  log(util.format.apply(util, arguments), 'warn')
}

exports.error = function() {
  log(util.format.apply(util, arguments), 'error')
}