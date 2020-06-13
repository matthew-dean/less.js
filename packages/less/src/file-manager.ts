import path from 'path';
import fs from './fs';
import { FileManager, FileParser, IOptions, IImportOptions, Environment, FileObject, Node } from '@less/core'

class LessFileManager extends FileManager implements FileParser {

  loadFileSync(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ): FileObject {
    const file = environment.loadFileSync(filePath, currentDirectory, options)
    return {
      ...file,
      contents: file.contents.toString('utf8')
    }
  }

  async loadFileAsync(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment      
  ): Promise<FileObject> {
    const file = await environment.loadFileAsync(filePath, currentDirectory, options)
    return {
      ...file,
      contents: file.contents.toString('utf8')
    }
  }

  parseFile(file: FileObject, options: IOptions & IImportOptions): Node {

  }
}

export default FileManager;