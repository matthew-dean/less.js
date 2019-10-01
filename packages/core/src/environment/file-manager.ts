import { IOptions } from '../options'
import Environment from './environment'
import {
  Node,
  IImportOptions
} from '../tree/nodes'

export type FileObject = {
  filename: string
  contents: string
}

export default abstract class FileManager {
  /**
   * Given the full path to a file, return the path component
   */
  abstract getPath(filename: string): string
  abstract tryAppendExtension(path: string, ext: string): string

  /* Append a .less extension if appropriate. Only called if less thinks one could be added. */
  protected tryAppendLessExtension(path: string) {
    return this.tryAppendExtension(path, '.less')
  }

  /**
   * Whether the rootpath should be converted to be absolute.
   * The browser ovverides this to return true because urls must be absolute.
   */
  abstract alwaysMakePathsAbsolute(): boolean

  /**
   * Returns whether a path is absolute
   */
  abstract isPathAbsolute(path: string): boolean

  /**
   * Joins together 2 paths
   */
  abstract joinPath(basePath: string, path: string): string

  /**
   * Returns the difference between 2 paths
   * E.g. url = a/ baseUrl = a/b/ returns ../
   * url = a/b/ baseUrl = a/ returns b/
   */
  abstract pathDiff(url: string, baseUrl: string): string

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
  abstract loadFile(
    filename: string,
    currentDirectory: string,
    options: IOptions,
    environment: Environment
  ): Promise<FileObject>

  /**
   * Loads a file synchronously.
   */
  abstract loadFileSync(
    filename: string,
    currentDirectory: string,
    options: IOptions,
    environment: Environment
  ): FileObject

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
