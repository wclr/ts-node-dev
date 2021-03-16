"use strict";
exports.__esModule = true;
exports.makeNotify = void 0;
var path_1 = require("path");
var notifier = null;
try {
    notifier = require('node-notifier');
}
catch (error) {
    notifier = null;
}
function icon(level) {
    return path_1["default"].resolve(__dirname, '../icons/node_' + level + '.png');
}
/**
 * Displays a desktop notification and writes a message to the console.
 */
exports.makeNotify = function (cfg, log) {
    return function (title, msg, level) {
        level = level || 'info';
        log([title, msg].filter(function (_) { return _; }).join(': '), level);
        if (notifier !== null && cfg.notify) {
            notifier.notify({
                title: title || 'node.js',
                icon: icon(level),
                message: msg
            });
        }
    };
};
