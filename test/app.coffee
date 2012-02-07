http = require 'http'
message = require './message'

server = http.createServer (req, res) ->
    res.writeHead 200,
        'Content-Type': 'text/plain'

    res.write message
    res.end '\n'

server.listen 8080

console.log 'Server running at http://localhost:8080/'
console.log message
