const crypto = require('crypto')
const path = require('path')
const cwd = process.cwd()

module.exports = (code, fileName, compiledDir) => {
  const hash = crypto
    .createHash('sha256')
    .update(fileName + code, 'utf8')
    .digest('hex')
  fileName = path.relative(cwd, fileName)
  const hashed = fileName.replace(/[^\w]/g, '_') + '_' + hash + '.js'
  return path.join(compiledDir, hashed)
}
