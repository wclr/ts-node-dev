var crypto = require('crypto')
var join = require('path').join

module.exports = (code, fileName, compiledDir) => {
  var hash = crypto.createHash('sha256')
  .update(fileName + code, 'utf8').digest('hex')
  var hashed = 
    fileName.replace(/[^\w]/g, '_') +
    '_' + hash + 
    '.js'
  return join(compiledDir, hashed )
}