import { fn } from './dep'
import { A } from './dep-interface'
const str: string = process.argv[2]
const obj: A = {
  a: '1',
  b: 2
}

fn(1)
console.log('test', str)


setInterval(() => {
  console.log('Working')
}, 5000)


console.log('test', str)

//throw new Error('fds')
