http = require 'http'
message = require './message'

server = http.createServer (req, resp, _) ->
    try
        resp.writeHead 200,
            'Content-Type': 'text/plain'

        resp.write message
        resp.end '\n'

    catch err
        resp.writeHead 500,
            'Content-Type': 'text/plain'

        resp.write err.toString()
        resp.end '\n'

server.listen 8080

console.log 'Listening at http://localhost:8080/ ...'
console.log message
