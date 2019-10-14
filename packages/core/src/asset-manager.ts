
import LessError from './less-error'
import Visitor from './visitors/visitor'
import { Less } from './index'
import { Plugin } from './types'
import FileManager from './environment/file-manager'
import { IFileInfo, Node, IImportOptions } from './tree/nodes'
import { Context } from './tree/context'
import Environment, { FileObject } from './environment/environment'
import options from './options'
import { Parser } from '@less/parser'

/**
 * Manages assets dynamically added per "parse/eval session"
 * -- specifically imports and plugins
 */
export class AssetManager {
  private less: Less
  private environment: Environment
  private context: Context
  private rootFileInfo: IFileInfo
  private pluginIterator: number = -1
  private queue: Set<string>

  plugins: Plugin[] = []
  // A map of files to Abstract Syntax Trees
  imports: { [filename: string]: Node }

  constructor(less: Less, environment: Environment, context: Context, rootFileInfo: IFileInfo) {
    this.less = less
    this.environment = environment
    this.context = context
    this.rootFileInfo = rootFileInfo
    // this.contents = {};             // map - filename to contents of all the files
    // this.contentsIgnoredChars = {}; // map - filename to lines at the beginning of each file to ignore
    // this.mime = context.mime
    this.imports = {}
    this.queue = new Set()
  }

  /**
   * Add an import to be imported
   * @param path - the raw path (can be just the filename, a relative path, an absolute path...
   *               the @import is not opinionated - It's up to the file manager to decide if it's valid)
   * @param currentFileInfo - the current file info (the parent file root's fileInfo props)
   * @param importOptions - import options
   * @param callback - callback for when it is imported (or returns an error)
   */
  addImport(
    path: string,
    currentFileInfo: IFileInfo,
    importOptions: IImportOptions,
    callback: Function
  ) {
    const options = this.context.options
    const environment = this.environment
    const currentDirectory = currentFileInfo.path

    this.queue.add(path)

      // const fileParsedFunc = (e, root, fullPath) => {
      //     importManager.queue.splice(importManager.queue.indexOf(path), 1); // Remove the path from the queue

      //     const importedEqualsRoot = fullPath === importManager.rootFilename;
      //     if (importOptions.optional && e) {
      //         callback(null, {rules:[]}, false, null);
      //         logger.info(`The file ${fullPath} was skipped because it was not found and the import was marked optional.`);
      //     }
      //     else {
      //         // Inline imports aren't cached here.
      //         // If we start to cache them, please make sure they won't conflict with non-inline imports of the
      //         // same name as they used to do before this comment and the condition below have been added.
      //         if (!importManager.files[fullPath] && !importOptions.inline) {
      //             importManager.files[fullPath] = { root, options: importOptions };
      //         }
      //         if (e && !importManager.error) { importManager.error = e; }
      //         callback(e, root, importedEqualsRoot, fullPath);
      //     }
      // }
    const fileManagerOptions = {...options, ...importOptions}
    const fileManager = environment.getFileManager(path, currentFileInfo.path, fileManagerOptions)

    if (!fileManager) {
      return callback(new LessError({ message: `Could not find a file-manager for '${path}'` }))
    }

      // const loadFileCallback = loadedFile => {
      //     let plugin;
      //     const resolvedFilename = loadedFile.filename;
      //     const contents = loadedFile.contents.replace(/^\uFEFF/, '');

      //     // Pass on an updated rootpath if path of imported file is relative and file
      //     // is in a (sub|sup) directory
      //     //
      //     // Examples:
      //     // - If path of imported file is 'module/nav/nav.less' and rootpath is 'less/',
      //     //   then rootpath should become 'less/module/nav/'
      //     // - If path of imported file is '../mixins.less' and rootpath is 'less/',
      //     //   then rootpath should become 'less/../'
      //     newFileInfo.currentDirectory = fileManager.getPath(resolvedFilename);
      //     if (newFileInfo.rewriteUrls) {
      //         newFileInfo.rootpath = fileManager.join(
      //             (importManager.context.rootpath || ''),
      //             fileManager.pathDiff(newFileInfo.currentDirectory, newFileInfo.entryPath));

      //         if (!fileManager.isPathAbsolute(newFileInfo.rootpath) && fileManager.alwaysMakePathsAbsolute()) {
      //             newFileInfo.rootpath = fileManager.join(newFileInfo.entryPath, newFileInfo.rootpath);
      //         }
      //     }
      //     newFileInfo.filename = resolvedFilename;

      //     const newEnv = new contexts.Parse(importManager.context);

      //     newEnv.processImports = false;
      //     importManager.contents[resolvedFilename] = contents;

      //     if (currentFileInfo.reference || importOptions.reference) {
      //         newFileInfo.reference = true;
      //     }

      //     if (importOptions.isPlugin) {
      //         plugin = pluginLoader.evalPlugin(contents, newEnv, importManager, importOptions.pluginArgs, newFileInfo);
      //         if (plugin instanceof LessError) {
      //             fileParsedFunc(plugin, null, resolvedFilename);
      //         }
      //         else {
      //             fileParsedFunc(null, plugin, resolvedFilename);
      //         }
      //     } else if (importOptions.inline) {
      //         fileParsedFunc(null, contents, resolvedFilename);
      //     } else {

      //         // import (multiple) parse trees apparently get altered and can't be cached.
      //         // TODO: investigate why this is
      //         if (importManager.files[resolvedFilename]
      //             && !importManager.files[resolvedFilename].options.multiple
      //             && !importOptions.multiple) {

      //             fileParsedFunc(null, importManager.files[resolvedFilename].root, resolvedFilename);
      //         }
      //         else {
      //             new Parser(newEnv, importManager, newFileInfo).parse(contents, (e, root) => {
      //                 fileParsedFunc(e, root, resolvedFilename);
      //             });
      //         }
      //     }
      // };
      // let promise;
      // const context = utils.clone(this.context);

      let resolvedFile: FileObject
      /** @todo - guard against circular imports */
      fileManager.loadFile(path, currentDirectory, fileManagerOptions, environment)
        .then((file: FileObject) => {
          resolvedFile = file
          const ast = this.imports[file.filename]
          this.queue.delete(path)
          if (ast) {
            return callback(null, ast.clone())
          }
          return fileManager.parseFile(file, fileManagerOptions)
        })
        .then((ast: Node) => {
          if (ast) {
            this.imports[resolvedFile.filename] = ast
            callback(null, ast)
          }
        })
        .catch(err => {
          this.queue.delete(path)
          callback(err)
        })
  }

  addPlugin(plugin: Plugin) {
    if (plugin instanceof Function) {
      plugin = plugin()
    }
    this.plugins.push(plugin)

    if (plugin.install) {
      plugin.install(this.less, this)
    }
  }

  /**
   * Adds a visitor. The visitor object has options on itself to determine
   * when it should run.
   */
  addVisitor(visitor: Visitor) {
    this.environment.visitors.push(visitor)
  }

  /**
   * Adds a file manager to the (currently building) environment
   */
  addFileManager(manager: FileManager) {
    this.environment.fileManagers.push(manager)
  }

  protected getFileManagers(): FileManager[] {
    return this.environment.fileManagers
  }

  protected getVisitors(): Visitor[] {
    return this.environment.visitors
  }

  /** Still needed? */
  visitor() {
    return {
      first: () => {
        this.pluginIterator = -1
        return this.environment.visitors[this.pluginIterator]
      },
      get: function() {
        this.pluginIterator += 1
        return this.environment.visitors[this.pluginIterator]
      }
    }
  }
}

export default AssetManager