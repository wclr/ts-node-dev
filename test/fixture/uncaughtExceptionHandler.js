process.on('uncaughtException', function (e) {
  setTimeout(function () {
    console.log('async', e);
  }, 100);
});

/* eslint-disable no-undef */
foo(); // undefined / throws exception
