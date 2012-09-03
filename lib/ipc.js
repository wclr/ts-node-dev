function isNodeDevMessage(m) {
  return m.cmd == 'NODE_DEV'
}

exports.send = function(m, dest) {
  m.cmd = 'NODE_DEV'
  if (!dest) dest = process
  if (dest.send) dest.send(m)
}

exports.on = function(proc, type, cb) {
  function handleMessage(m) {
    if (isNodeDevMessage(m) && type in m) cb(m)
  }
  proc.on('internalMessage', handleMessage)
  proc.on('message', handleMessage)
}

exports.relay = function(src, dest) {
  if (!dest) dest = process
  function relayMessage(m) {
    if (isNodeDevMessage(m)) dest.send(m)
  }
  src.on('internalMessage', relayMessage)
  src.on('message', relayMessage)
}
