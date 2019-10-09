
import LessError from './less-error'
import Visitor from './visitor/visitor'
import { Less } from './index'
import { Plugin } from './types'
import FileManager from './environment/file-manager'
import { IFileInfo, Node, IImportOptions } from './tree/nodes'
import { EvalContext } from './tree/contexts'

/**
 * Manages assets dynamically added per "parse/eval session"
 * -- specifically imports and plugins
 */
export class AssetManager {
  less: Less
  context: EvalContext
  rootFileInfo: IFileInfo
  visitors: Visitor[] = []
  fileManagers: FileManager[] = []
  pluginIterator: number = -1
  queue: Set<string>

  plugins: Plugin[] = []
  // A map of files to Abstract Syntax Trees
  imports: { [filename: string]: Node }

  constructor(less: Less, context: EvalContext, rootFileInfo: IFileInfo) {
    this.less = less
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
   * @param path - the raw path
   * @param tryAppendExtension - whether to try appending a file extension (.less or .js if the path has no extension)
   * @param currentFileInfo - the current file info (used for instance to work out relative paths)
   * @param importOptions - import options
   * @param callback - callback for when it is imported
   */
  addImport(
    path: string,
    tryAppendExtension: boolean | string,
    currentFileInfo: IFileInfo,
    importOptions: IImportOptions,
    callback: Function
  ) {
    const environment = this.less.environment
    this.queue.add(path)

      const fileParsedFunc = (e, root, fullPath) => {
          importManager.queue.splice(importManager.queue.indexOf(path), 1); // Remove the path from the queue

          const importedEqualsRoot = fullPath === importManager.rootFilename;
          if (importOptions.optional && e) {
              callback(null, {rules:[]}, false, null);
              logger.info(`The file ${fullPath} was skipped because it was not found and the import was marked optional.`);
          }
          else {
              // Inline imports aren't cached here.
              // If we start to cache them, please make sure they won't conflict with non-inline imports of the
              // same name as they used to do before this comment and the condition below have been added.
              if (!importManager.files[fullPath] && !importOptions.inline) {
                  importManager.files[fullPath] = { root, options: importOptions };
              }
              if (e && !importManager.error) { importManager.error = e; }
              callback(e, root, importedEqualsRoot, fullPath);
          }
      }

      const fileManager = environment.getFileManager(path, currentFileInfo.currentDirectory, this.context, environment);

      if (!fileManager) {
          fileParsedFunc({ message: `Could not find a file-manager for ${path}` });
          return;
      }

      const loadFileCallback = loadedFile => {
          let plugin;
          const resolvedFilename = loadedFile.filename;
          const contents = loadedFile.contents.replace(/^\uFEFF/, '');

          // Pass on an updated rootpath if path of imported file is relative and file
          // is in a (sub|sup) directory
          //
          // Examples:
          // - If path of imported file is 'module/nav/nav.less' and rootpath is 'less/',
          //   then rootpath should become 'less/module/nav/'
          // - If path of imported file is '../mixins.less' and rootpath is 'less/',
          //   then rootpath should become 'less/../'
          newFileInfo.currentDirectory = fileManager.getPath(resolvedFilename);
          if (newFileInfo.rewriteUrls) {
              newFileInfo.rootpath = fileManager.join(
                  (importManager.context.rootpath || ''),
                  fileManager.pathDiff(newFileInfo.currentDirectory, newFileInfo.entryPath));

              if (!fileManager.isPathAbsolute(newFileInfo.rootpath) && fileManager.alwaysMakePathsAbsolute()) {
                  newFileInfo.rootpath = fileManager.join(newFileInfo.entryPath, newFileInfo.rootpath);
              }
          }
          newFileInfo.filename = resolvedFilename;

          const newEnv = new contexts.Parse(importManager.context);

          newEnv.processImports = false;
          importManager.contents[resolvedFilename] = contents;

          if (currentFileInfo.reference || importOptions.reference) {
              newFileInfo.reference = true;
          }

          if (importOptions.isPlugin) {
              plugin = pluginLoader.evalPlugin(contents, newEnv, importManager, importOptions.pluginArgs, newFileInfo);
              if (plugin instanceof LessError) {
                  fileParsedFunc(plugin, null, resolvedFilename);
              }
              else {
                  fileParsedFunc(null, plugin, resolvedFilename);
              }
          } else if (importOptions.inline) {
              fileParsedFunc(null, contents, resolvedFilename);
          } else {

              // import (multiple) parse trees apparently get altered and can't be cached.
              // TODO: investigate why this is
              if (importManager.files[resolvedFilename]
                  && !importManager.files[resolvedFilename].options.multiple
                  && !importOptions.multiple) {

                  fileParsedFunc(null, importManager.files[resolvedFilename].root, resolvedFilename);
              }
              else {
                  new Parser(newEnv, importManager, newFileInfo).parse(contents, (e, root) => {
                      fileParsedFunc(e, root, resolvedFilename);
                  });
              }
          }
      };
      let promise;
      const context = utils.clone(this.context);

      if (tryAppendExtension) {
          context.ext = importOptions.isPlugin ? '.js' : '.less';
      }

      if (importOptions.isPlugin) {
          context.mime = 'application/javascript';
          promise = pluginLoader.loadPlugin(path, currentFileInfo.currentDirectory, context, environment, fileManager);
      }
      else {
          promise = fileManager.loadFile(path, currentFileInfo.currentDirectory, context, environment,
              (err, loadedFile) => {
                  if (err) {
                      fileParsedFunc(err);
                  } else {
                      loadFileCallback(loadedFile);
                  }
              });
      }
      if (promise) {
          promise.then(loadFileCallback, fileParsedFunc);
      }
  }
}

export default environment => {
    ImportManager.prototype.environment = environment
    return ImportManager
};
