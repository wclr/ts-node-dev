import { ChildProcess } from 'child_process'
import type { CompileParams } from './compiler'

export type IPCMessage = {
  cmd?: string
  code?: string
  error?: string
  message?: string
  willTerminate?: boolean
  required?: string
}

/**
 * Checks if the given message is an internal node-dev message.
 */
function isNodeDevMessage(m: any): m is IPCMessage {
  return m.cmd === 'NODE_DEV'
}

/**
 * Check if the given message is an compile request message.
 */
function isCompileRequestMessage(m: any): m is CompileParams {
  return typeof m.compile === 'string' && typeof m.compiledPath === 'string'
}

/**
 * Sends a message to the given process.
 */
export const send = function (m: IPCMessage, dest: NodeJS.Process = process) {
  m.cmd = 'NODE_DEV'
  if (dest.send) dest.send(m)
}

export const on = function (
  proc: ChildProcess,
  type: string,
  cb: (m: IPCMessage) => void
) {
  function handleMessage(m: any) {
    if (isNodeDevMessage(m) && type in m) cb(m)
  }
  proc.on('internalMessage', handleMessage)
  proc.on('message', handleMessage)
}

export const relay = function (
  src: ChildProcess,
  dest: NodeJS.Process = process
) {
  function relayMessage(m: any) {
    if (isNodeDevMessage(m) || isCompileRequestMessage(m)) dest.send!(m)
  }
  src.on('internalMessage', relayMessage)
  src.on('message', relayMessage)
}
