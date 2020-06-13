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
   * Returns whether this file manager supports this file for syncronous file retrieval
   */
  supportsSync(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ): boolean {
    return environment.supportsSync(filePath, currentDirectory, options)
  }

  /**
   * Returns whether this file manager supports this file
   */
  supports(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ): boolean {
    return environment.supports(filePath, currentDirectory, options)
  }

  loadFileAsync(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ): Promise<FileObject> {
    return environment.loadFileAsync(filePath, currentDirectory, options)
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
    return environment.loadFileSync(filePath, currentDirectory, options)
  }
}

export default FileManager
