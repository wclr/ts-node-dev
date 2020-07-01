import { fn } from './dep'

console.log(fn(1))

require('./.rcfile')

const json = require('./file.json')

console.log('json',json)
console.log('JS MODULE')
