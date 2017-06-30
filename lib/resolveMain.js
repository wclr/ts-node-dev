var resolve = require('resolve').sync;

module.exports = function (main) {
  var resolved
  try {
    return resolve(main + '.ts', {
      basedir: process.cwd(),
      paths: [process.cwd()]
    });
  } catch (e) {
    return resolve(main, {
      basedir: process.cwd(),
      paths: [process.cwd()]
    });
  }  
};
