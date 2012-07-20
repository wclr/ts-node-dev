try {
  require('some_module_that_does_not_exits')
}
catch (err) {
  console.log('Caught', err)
}
