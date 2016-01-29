process.on('uncaughtException', function(e) {
  setTimeout(function() {
    console.log('async', e)
  }, 100)
})

foo() // undefined / throws exception
