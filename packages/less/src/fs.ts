import type * as fsType from 'fs'
let fs: typeof fsType
try {
  fs = require('graceful-fs')
} catch (e) {
  fs = require('fs')
}
export default fs