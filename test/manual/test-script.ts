import { fn } from './dep'
import { A } from './dep-interface'
const chalk = require('chalk')
const str: string = process.argv[2]
const obj: A = {
  a: '1',
  b: 2
}

fn(1)

console.log('test', str)


setInterval(() => {
  console.log(chalk.green('Working'))
}, 5000)


console.log('test', str)
setTimeout(() => {
  throw new Error('fds')
}, 1000)

