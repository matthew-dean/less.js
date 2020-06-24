import { IOptions } from '../options'
import Environment, { FileObject } from './environment'
import { Node, IImportOptions } from '../tree/nodes'

export interface FileParser {
  /**
   * Given file object and options, returns a single Less AST node
   */
  parseFile(file: FileObject, options: IOptions & IImportOptions): Node
}
export abstract class FileManager {
  /**
   * Returns whether this file manager supports this file
   */
  abstract supports(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ): boolean

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

  /**
   * Loads a file synchronously. This is still normalized as a Promise to make code paths easier.
   */
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
}

export default FileManager
