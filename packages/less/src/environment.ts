import { Environment, FileObject, IOptions, IImportOptions, IFileInfo } from '@less/core'
import fs from './fs'
import * as path from 'path'
import mime from 'mime'
import sourceMap from 'source-map'
import resolve from 'resolve'

const NPM_PREFIX = 'npm://'
export class NodeEnvironment extends Environment {
  supports = () => true
  supportsSync = () => true

  encodeBase64(str: string) {
    // Avoid Buffer constructor on newer versions of Node.js.
    const buffer = (Buffer.from ? Buffer.from(str) : (new Buffer(str)))
    return buffer.toString('base64')
  }

  mimeLookup(filename: string) {
    return mime.lookup(filename)
  }

  charsetLookup(mimeType: string) {
    return mime.charsets.lookup(mimeType)
  }

  getSourceMapGenerator() {
    return sourceMap.SourceMapGenerator
  }

  getFileInfo(filePath: string) {
    const fileParts = path.parse(filePath)
    return {
      filename: fileParts.base,
      path: fileParts.dir
    }
  }

  getPath(filePath: string) {
    const fileParts = path.parse(filePath)
    return fileParts.dir
  }

  joinPath = path.join
  pathDiff = path.relative
  isPathAbsolute = path.isAbsolute
  normalizePath = path.normalize

  resolveFile(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions
  ): string {
    const isAbsoluteFilename = this.isPathAbsolute(filePath)
    const paths = isAbsoluteFilename ? [] : [currentDirectory]
    if (options.paths) { paths.push(...options.paths) }
    if (!isAbsoluteFilename && paths.indexOf('.') === -1) { paths.push('.') }
    
    return resolve.sync(filePath, {
      basedir: currentDirectory,
      paths,
      extensions: [options.ext]
    })
  }

  loadFile(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions
  ) {
    return new Promise<FileObject>((resolve, reject) => {
      try {
        const file = this.resolveFile(filePath, currentDirectory, options)
        const fileManager = this.getFileManager(file, currentDirectory, options)
        const loader = options.syncImport
          ? fileManager.loadFileSync
          : fileManager.loadFileAsync

        resolve(loader(file, currentDirectory, options, this))
      } catch (e) {
        reject(e)
      }
    })
  }
  
  loadFileSync(filePath: string) {
    const fileInfo = this.getFileInfo(filePath)
    const contents = fs.readFileSync(filePath)
    return {
      contents,
      ...fileInfo
    }
  }

  loadFileAsync(filePath: string) {
    const fileInfo = this.getFileInfo(filePath)
    return new Promise<FileObject>((resolve, reject) => {
      fs.readFile(filePath, (err, contents) => {
        if (err) {
          return reject(err)
        }
        resolve({
          contents,
          ...fileInfo
        })
      })
    })
  }
}
