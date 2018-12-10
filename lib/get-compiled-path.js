var crypto = require('crypto')
var path = require('path')
var cwd = process.cwd()

module.exports = (code, fileName, compiledDir) => {
  var hash = crypto
    .createHash('sha256')
    .update(fileName + code, 'utf8')
    .digest('hex')
  fileName = path.relative(cwd, fileName)
  var hashed = fileName.replace(/[^\w]/g, '_') + '_' + hash + '.js'
  return path.join(compiledDir, hashed)
}
