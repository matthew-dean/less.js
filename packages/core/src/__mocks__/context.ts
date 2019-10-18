import { Context } from '../tree/context'
// import Less from '../index'
import Environment, { FileObject } from '../environment/environment'
import Logger from '../environment/logger'

export class MockEnvironment extends Environment {
  getFileInfo(filePath: string) {
    return { filename: '', path: ''}
  }

  encodeBase64(str: string) { return str }
  mimeLookup(filename: string) { return 'text/plain' }
  charsetLookup(mime: string) { return 'utf-8' }
  getSourceMapGenerator() {
    return function() {}
  }
  getPath(filePath: string) { return '' }
  tryAppendExtension(path: string, ext: string) { return path + ext }
  alwaysMakePathsAbsolute() { return false }
  isPathAbsolute(path: string) { return false }
  joinPath(basePath: string, path: string) { return basePath + path }
  pathDiff(url: string, baseUrl: string) { return url }
  loadFile(filePath: string) {
    return new Promise<FileObject>((resolve, reject) => {
      resolve(this.loadFileSync(filePath))
    })
  }

  loadFileAsync(filePath: string) {
    return this.loadFile(filePath)
  }
  loadFileSync(filePath: string) {
    return {
      filename: '',
      path: '',
      contents: 'foo'
    }
  }
  supportsSync(
    filePath,
    currentDirectory,
    options
  ) {
    return true
  }
  supports(
    filePath,
    currentDirectory,
    options
  ) {
    return true
  }

  normalizePath(path: string) {
    return path
  }
}

export class MockLogger extends Logger {
  error(msg: string) {
    console.error(msg)
  }
  warn(msg: string) {
    console.warn(msg)
  }
  info(msg: string) {
    console.info(msg)
  }
  debug(msg: string) {
    console.debug(msg)
  }
}

export const environment = new MockEnvironment([], [], new MockLogger())
const less = {
  version: [0, 0, 0],
  environment,
  options: {},
  parse: null,
  render: null
}
export const context = new Context(less, environment, {})