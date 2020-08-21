import fs from 'fs'
const filePath = process.argv[2]

const handler = function (stat: fs.Stats) {
  if (stat && stat.birthtime.getTime() > 0) {
    process.exit(0)
  }
}

fs.watchFile(filePath, { interval: 100 }, handler)
fs.stat(filePath, function (err, stat) {
  handler(stat)
})
