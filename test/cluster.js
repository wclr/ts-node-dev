var cluster = require('cluster');
var http = require('http');

if (cluster.isMaster) {
  for (var i = 0; i < 2; i++) {
    console.log('Forking worker', i);
    cluster.fork();
  }

  cluster.on('death', function(worker) {
    console.log('worker ' + worker.pid + ' died');
  });
}
else {
  console.log('Worker started');
  // Worker processes have a http server.
  http.Server(function(req, res) {
    res.writeHead(200);
    res.end("hello world\n");
  }).listen(8000);
}
