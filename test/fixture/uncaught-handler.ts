process.on('uncaughtException', function (e) {
  setTimeout(function () {
    console.log('async', e);
  }, 100);
});

//const foo = () => {console.log('s')}

// eslint-disable-next-line no-undef
foo(); // undefined / throws exception