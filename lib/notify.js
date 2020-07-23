var path = require('path');
var notifier = null;
try {
  notifier = require('node-notifier');
} catch (error) {
  notifier = null;
}

function icon(level) {
  return path.resolve(__dirname, '../icons/node_' + level + '.png');
}

/**
 * Displays a desktop notification and writes a message to the console.
 */
module.exports = function (cfg, log) {
  return function (title, msg, level) {
    level = level || 'info';
    log([title, msg].filter(_ => _).join(': '), level);
    if (notifier !== null && cfg.notify) {
      notifier.notify({
        title: title || 'node.js',
        icon: icon(level),
        message: msg
      });
    }
  };
};
