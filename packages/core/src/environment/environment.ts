import FileManager from './file-manager'
import { IOptions } from '../options'
import Logger from './logger'
import { IFileInfo, IImportOptions } from '../tree/nodes'
import Visitor from '../visitors/visitor'

export type FileObject = {
  filename: string
  path: string
  contents: string | Buffer,
  fileManager: FileManager
}

/**
 * The Environment class is an abstraction between the Less compiler
 * and the JavaScript environment where it's executed.
 *
 * File I/O operations, logging, module resolution etc are all
 * managed by the environment instance.
 *
 * e.g. When Less encounters an @import, it passes the URL to the environment,
 *      with a Promise that is either fulfilled or rejected by the environment.
 */
export abstract class Environment {
  fileManagers: FileManager[]
  visitors: Visitor[]
  logger: Logger

  constructor(fileManagers: FileManager[], visitors: Visitor[], logger: Logger) {
    this.fileManagers = fileManagers || []
    this.visitors = visitors
    this.logger = logger
  }

  abstract getFileInfo(filePath: string): IFileInfo

  /**
   * Converts a string to a base 64 string
   */
  abstract encodeBase64(str: string): string

  /**
   * Return the mime-type of a filename
   */
  abstract mimeLookup(filename: string): string

  /**
   * Return the charset of a mime type
   */
  abstract charsetLookup(mime: string): string

  /**
   * Gets a source map generator
   */
  abstract getSourceMapGenerator(): Function

  getFileManager(filePath: string, currentDirectory: string, options: IOptions & IImportOptions) {
    const fileManagers = this.fileManagers

    if (!filePath || !currentDirectory) {
      return
    }

    /**
     * Search fileManagers from back to front
     * (The last one added is the first one tested.)
     */
    for (let i = fileManagers.length - 1; i >= 0; i--) {
      const fileManager = fileManagers[i]
      if (fileManager.supports(filePath, currentDirectory, options, this)) {
        return fileManager
      }
    }
    return
  }

  /**
   * the following methods
   */
  /**
   * Given the full path to a file, return the path component
   */
  abstract getPath(filePath: string): string
  protected tryAppendExtension(path: string, ext: string): string {
    if (!path.match(new RegExp(ext.replace('.', '\\.') + '$'))) {
      return `${path}${ext}`
    }
  }

  /* Append a .less extension if appropriate. Only called if less thinks one could be added. */
  protected tryAppendLessExtension(path: string) {
    return this.tryAppendExtension(path, '.less')
  }

  /**
   * @note The following methods were moved from the abstract file manager, because they
   *       are more logically part of the environment (which is an abstraction between the
   *       compiler and the underlying JavaScript runtime / OS) than part of a file manager
   *       (which is responsible for managing behavior of imported files and returning
   *       AST nodes).
   */
  /**
   * Whether the rootpath should be converted to be absolute.
   * The browser ovverides this to return true because urls must be absolute.
   */
  // abstract alwaysMakePathsAbsolute(): boolean

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
   * @note - The following were moved up from file managers to the environment, as this is
   *         again more logically part of the environment interface, but individual
   *         file managers can decide to override / extend the environment on a per-file basis.
   */

  /**
   * A Promise-based abstraction between loadFileAsync / loadFileSync
   * 
   * @param filePath - A path from `@import "[path]"` that we need to resolve. 
   */
  abstract loadFile(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions
  ): Promise<FileObject>

  /**
   * Loads a file asynchronously. Expects a promise that either rejects with an error or fulfills with an
   * object containing
   *  { filePath: - full resolved path to file
   *    contents: - the contents of the file, as a string }
   */
  abstract loadFileAsync(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions
  ): Promise<FileObject>

  /**
   * Loads a file synchronously.
   */
  abstract loadFileSync(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions
  ): FileObject

  /**
   * Returns whether this environment supports this file for syncronous file retrieval
   */
  abstract supportsSync(
    filePath: string,
    currentDirectory?: string,
    options?: IOptions & IImportOptions
  ): boolean

  /**
   * Returns whether this environment supports this file for asyncronous retrieval
   */
  abstract supports(
    filePath: string,
    currentDirectory?: string,
    options?: IOptions & IImportOptions
  ): boolean

  /**
   * Collapse '.' and '..' in paths
   */
  abstract normalizePath(path: string): string
}

export default Environment
