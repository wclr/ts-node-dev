console.log('v1')

process.on('message', function(m) {
  console.log(m);
  process.disconnect();
  process.exit();
})