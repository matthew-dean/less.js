import { IOptions } from '../options'
import Environment, { FileObject } from './environment'
import {
  Node,
  IImportOptions
} from '../tree/nodes'

export default abstract class FileManager {
  /**
   * Returns whether this file manager supports this file for syncronous file retrieval
   */
  abstract supportsSync(
    filename: string,
    currentDirectory: string,
    options: IOptions,
    environment: Environment
  ): boolean

  /**
   * Returns whether this file manager supports this file
   */
  abstract supports(
    filename: string,
    currentDirectory: string,
    options: IOptions,
    environment: Environment
  ): boolean

  /**
   * Loads a file asynchronously. Expects a promise that either rejects with an error or fulfills with an
   * object containing
   *  { filename: - full resolved path to file
   *    contents: - the contents of the file, as a string }
   */
  protected loadFile(
    filename: string,
    currentDirectory: string,
    options: IOptions,
    environment: Environment
  ): Promise<FileObject> {
    return environment.loadFile(filename)
  }

  /**
   * Loads a file synchronously.
   */
  protected loadFileSync(
    filename: string,
    currentDirectory: string,
    options: IOptions,
    environment: Environment
  ): FileObject {
    return environment.loadFileSync(filename)
  }

  /**
   * Given file contents and import options, returns a single node
   */
  protected parseFile(
    parser,
    file: FileObject,
    options: IOptions,
    importOptions: IImportOptions
  ): Node {
    
  }
}
