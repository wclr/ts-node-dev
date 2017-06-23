var crypto = require('crypto')
var join = require('path').join

module.exports = (code, fileName, compiledDir) => {
  var hashed = crypto.createHash('sha256')
    .update(fileName + code, 'utf8').digest('hex') + '.js'
  return join(compiledDir, hashed)
}