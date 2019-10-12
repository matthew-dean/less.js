import { IOptions } from '../options'
import Environment, { FileObject } from './environment'
import {
  Node,
  IImportOptions
} from '../tree/nodes'

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

  /**
   * Loads a file asynchronously. Expects a promise that either rejects with an error or fulfills with an
   * object containing
   *  { filename: - full resolved path to file
   *    contents: - the contents of the file, as a string }
   */
  loadFile(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ): Promise<FileObject> {
    return environment.loadFile(filePath)
  }

  /**
   * Loads a file synchronously. This is still normalized as a Promise to make code paths easier.
   */
  loadFileSync(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ): Promise<FileObject> {
    return environment.loadFileSync(filePath)
  }

  /**
   * Given file object and options, returns a single Less AST node
   */
  abstract parseFile(
    file: FileObject,
    options: IOptions & IImportOptions
  ): Promise<Node>
}

export default FileManager