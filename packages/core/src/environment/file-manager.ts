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
  supportsSync(
    path: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ): boolean {
    return environment.supportsSync(path, currentDirectory, options)
  }

  /**
   * Returns whether this file manager supports this file
   */
  supports(
    path: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ): boolean {
    return environment.supports(path, currentDirectory, options)
  }

  /**
   * Loads a file asynchronously. Expects a promise that either rejects with an error or fulfills with an
   * object containing
   *  { filename: - full resolved path to file
   *    contents: - the contents of the file, as a string }
   */
  loadFile(
    path: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ): Promise<FileObject> {
    return environment.loadFile(path)
  }

  /**
   * Loads a file synchronously. This is still normalized as a Promise to make code paths easier.
   */
  loadFileSync(
    path: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ): Promise<FileObject> {
    return environment.loadFileSync(path)
  }

  /**
   * Given file object and options, returns a single Less AST node
   */
  abstract parseFile(
    file: FileObject,
    options: IOptions & IImportOptions
  ): Promise<Node>
}
