import { Environment, FileObject } from '@less/core'
import fs from './fs'
import * as path from 'path'
import mime from 'mime'
import sourceMap from 'source-map'

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

  loadFile(importPath: string) {
    return new Promise<FileObject>((resolve, reject) => {
      if (this.supportsSync()) {
        try {
          const file = this.loadFileSync(importPath)
          resolve(file)
        } catch (e) {
          reject(e)
        }
      } else {
        return this.loadFileAsync(importPath)
      }
    })
  }
  
  loadFileSync(importPath: string) {
    const fileInfo = this.getFileInfo(importPath)
    const contents = fs.readFileSync(importPath)
    return {
      contents,
      ...fileInfo
    }
  }

  loadFileAsync(importPath: string) {
    const fileInfo = this.getFileInfo(importPath)
    return new Promise<FileObject>((resolve, reject) => {
      fs.readFile(importPath, (err, contents) => {
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
