import path from 'path'
import { Config } from './cfg'
import { Log } from './log'
let notifier: any = null
try {
  notifier = require('node-notifier')
} catch (error) {
  notifier = null
}

function icon(level: string) {
  return path.resolve(__dirname, '../icons/node_' + level + '.png')
}

/**
 * Displays a desktop notification and writes a message to the console.
 */
export const makeNotify = function (cfg: Config, log: Log) {
  return function (title: string, msg: string, level?: string) {
    level = level || 'info'
    log([title, msg].filter((_) => _).join(': '), level)
    if (notifier !== null && cfg.notify) {
      notifier.notify({
        title: title || 'node.js',
        icon: icon(level),
        message: msg,
      })
    }
  }
}
