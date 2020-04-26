import { Context } from '../nodes'
import Environment, { FileObject } from '../../environment/environment'
import Logger from '../../environment/logger'
import { IFileInfo, IImportOptions } from '../../tree/nodes'
import DefaultOptions, { IOptions } from '../../options'
import { Less } from '../../'

/** Mock files */
const files: { [k: string]: string } = {
  'a.less': `
    @var: foo;
  `,
  'b.less': `
    .mixin() {
      .example {
        a: b;
      }
    }
  `
}

export class MockEnvironment extends Environment {
  getFileInfo(filePath: string) {
    return { filename: '', path: '' }
  }

  encodeBase64(str: string) {
    return str
  }
  mimeLookup(filename: string) {
    return 'text/plain'
  }
  charsetLookup(mime: string) {
    return 'utf-8'
  }
  getSourceMapGenerator() {
    return function () {}
  }
  getPath(filePath: string) {
    return ''
  }
  tryAppendExtension(path: string, ext: string) {
    return path + ext
  }
  alwaysMakePathsAbsolute() {
    return false
  }
  isPathAbsolute(path: string) {
    return false
  }
  joinPath(basePath: string, path: string) {
    return basePath + path
  }
  pathDiff(url: string, baseUrl: string) {
    return url
  }
  loadFile(filePath: string) {
    return new Promise<FileObject>((resolve, reject) => {
      const file = this.loadFileSync(filePath)
      if (file) {
        resolve(file)
      } else {
        reject(filePath)
      }
    })
  }

  loadFileAsync(filePath: string) {
    return this.loadFile(filePath)
  }
  /**
   * This mock will return the contents
   */
  loadFileSync(filePath: string) {
    return {
      filename: filePath,
      path: '',
      contents: files[filePath]
    }
  }
  supportsSync(filePath: string, currentDirectory?: string, options?: IOptions & IImportOptions) {
    return true
  }
  supports(filePath: string, currentDirectory?: string, options?: IOptions & IImportOptions) {
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
const less: Less = {
  version: [4, 0, 0],
  environment,
  options: {}
}
export const context = new Context(less, environment, DefaultOptions())
