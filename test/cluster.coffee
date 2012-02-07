cluster = require("cluster")
http = require("http")
if cluster.isMaster
  i = 0

  while i < 2
    console.log "Forking worker", i
    worker = cluster.fork()
    worker.on "message", (msg) ->
      console.log "Message from worker:", msg
    i++
else
  process.send "*** Worker started! ***"
  require "./server"
