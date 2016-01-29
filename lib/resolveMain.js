var resolve = require('resolve').sync;

module.exports = function (main) {
  return resolve(main, {
    basedir: process.cwd(),
    paths: [process.cwd()]
  });
};
