

import { parse } from './less.mjs'
import fs from 'fs'

const file = fs.readFileSync('./test.css', { encoding: 'utf-8' })
console.log(parse(file))