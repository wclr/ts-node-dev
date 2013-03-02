var cluster = require('cluster')
  , http = require('http')

if (cluster.isMaster) {
  for (var i = 0; i < 2; i++) {
    console.log('Forking worker', i)
    var worker = cluster.fork()
    worker.on('message', function(msg) {
      console.log('Message from worker:', msg)
    })
  }
}
else {
  console.log('Worker started.')
  process.send('Hello')
  require('./server')
}
