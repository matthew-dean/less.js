import FileManager from './file-manager'
import { IOptions } from '../options'
import Logger from './logger'
import { IFileInfo } from '../tree/nodes'

export type FileObject = {
  filename: string
  contents: string
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
abstract class Environment {
  fileManagers: FileManager[]
  logger: Logger

  constructor(fileManagers: FileManager[], logger: Logger) {
    this.fileManagers = fileManagers || []
    this.logger = logger
  }

  abstract getFileInfo(filename: string): IFileInfo

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

  getFileManager(filename: string, currentDirectory: string, options: IOptions) {
    const fileManagers = this.fileManagers

    if (!filename || !currentDirectory) {
      return
    }

    /**
     * Search fileManagers from back to front
     * (The last one added is the first one tested.)
     */
    for (let i = fileManagers.length - 1; i >= 0 ; i--) {
      const fileManager = fileManagers[i]
      if (fileManager.supports(filename, currentDirectory, options, this)) {
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
  abstract getPath(filename: string): string
  abstract tryAppendExtension(path: string, ext: string): string

  /* Append a .less extension if appropriate. Only called if less thinks one could be added. */
  protected tryAppendLessExtension(path: string) {
    return this.tryAppendExtension(path, '.less')
  }

  /**
   * @note The following methods were moved from the abstract file manager, because they
   *       are more logically part of the environment (which is an abstraction between Less
   *       and the underlying JavaScript runtime / OS) than part of a file manager (which is
   *       responsible for managing behavior of imported files and returning AST nodes).
   */
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
   * @note - The following were moved up from file managers to the environment, as this is
   *         again more logically part of the environment interface, but individual
   *         file managers can decide to alter text or reject based on the returned string
   */

  /**
   * Loads a file asynchronously. Expects a promise that either rejects with an error or fulfills with an
   * object containing
   *  { filename: - full resolved path to file
   *    contents: - the contents of the file, as a string }
   */
  abstract loadFile(filename: string): Promise<FileObject>

  /**
   * Loads a file synchronously.
   */
  abstract loadFileSync(filename: string): FileObject
}

export default Environment