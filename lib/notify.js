var path = require('path');
var notifier = require('node-notifier');

function icon(level) {
  return path.resolve(__dirname, '../icons/node_' + level + '.png');
}

/**
 * Displays a desktop notification and writes a message to the console.
 */
module.exports = function (cfg, log) {
  return function (title, msg, level) {
    level = level || 'info';
    log(title || msg, level);
    if (cfg.notify) {
      notifier.notify({
        title: title || 'node.js',
        icon: icon(level),
        message: msg
      });
    }
  };
};
