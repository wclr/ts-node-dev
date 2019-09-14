var path = require('path');
var notifier = require('node-notifier');

function icon(level) {
  return path.resolve(__dirname, '../icons/node_' + level + '.png');
}

function levelToInt(strLevel) {
  if (!strLevel) return 0;
  switch (strLevel.toLowerCase()) {
    case 'info': return 1;
    case 'error': return 3;
    default: return 0;
  }
}

/**
 * Displays a desktop notification and writes a message to the console.
 */
module.exports = function (cfg, log) {
  return function (title, msg, level) {
    level = level || 'info';
    log([title, msg].filter(_ => _).join(': '), level);
    if (cfg.notify && levelToInt(cfg.notifyLevel) <= levelToInt(level)) {
      notifier.notify({
        title: title || 'node.js',
        icon: icon(level),
        message: msg
      });
    }
  };
};
