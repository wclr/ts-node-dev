var http = require('http')
  , message = require('./message')

var server = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'})
  res.write(message)
  res.end('\n')
})

server.on('listening', function() {
  var addr = this.address()
  console.log('Server listening on %s:%s', addr.address, addr.port)
  console.log(message)
})
.listen(0)

process.on('SIGTERM', function() {
  server.close()
  setTimeout(function() { console.log('3') }, 200)
  setTimeout(function() { console.log('2') }, 400)
  setTimeout(function() { console.log('1') }, 600)
})

process.on('exit', function() {
  console.log('exit')
})
