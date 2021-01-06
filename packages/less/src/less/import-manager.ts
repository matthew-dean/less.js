import contexts, { Context } from './contexts';
import Parser from './parser/parser';
import LessError from './less-error';
import logger from './logger';
import type { Node, IFileInfo } from './tree/node';
export class ImportManager {
    /** @todo - define Less object */
    less: any
    rootFilename: string
    /** Search paths, when importing */
    paths: string[]
    /** map - filename to contents of all the files */
    contents: {
        [file: string]: string
    }
    /** map - filename to lines at the beginning of each file to ignore */
    contentsIgnoredChars: {
        [file: string]: string
    }
    mime: string
    error: Error
    context: Context
    queue: string[]
    /** Holds the imported parse trees. */
    files: {
        [file: string]: {
            root: Node
            options: any;
        }
    }
    /** @todo - refine type */
    environment: any;
    
    constructor(less: any, context: Context, rootFileInfo: IFileInfo) {
        this.less = less;
        this.rootFilename = rootFileInfo.filename;
        this.paths = context.options.paths || [];  
        this.contents = {};             
        this.contentsIgnoredChars = {};
        this.mime = context.mime;
        this.error = null;
        this.context = context;
        this.files = {};        
    }

    /**
     * Add an import to be imported
     * @param path - the raw path
     * @param tryAppendExtension - whether to try appending a file extension (.less or .js if the path has no extension)
     * @param currentFileInfo - the current file info (used for instance to work out relative paths)
     * @param importOptions - import options
     * @param callback - callback for when it is imported
     * 
     * @todo - When debugging, I discovered that any code error below will cause
     *         an indefinite hang without exit in the import-visitor
     */
    push(path, tryAppendExtension, currentFileInfo, importOptions, callback) {
        const environment = this.environment;
        const importManager = this;
        const pluginLoader = this.context.pluginManager.Loader;
        const context = this.context.create();
        context.options = { ...this.context.options };

        const fileParsedFunc = function (e, root?, fullPath?) {
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
        };

        const newFileInfo: Partial<IFileInfo> = {
            rewriteUrls: this.context.options.rewriteUrls,
            entryPath: currentFileInfo.entryPath,
            rootpath: currentFileInfo.rootpath,
            rootFilename: currentFileInfo.rootFilename
        };

        const fileManager = environment.getFileManager(path, currentFileInfo.currentDirectory, this.context, environment);

        if (!fileManager) {
            fileParsedFunc({ message: `Could not find a file-manager for ${path}` });
            return;
        }

        const loadFileCallback = function(loadedFile) {
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
                    (importManager.context.options.rootpath || ''),
                    fileManager.pathDiff(newFileInfo.currentDirectory, newFileInfo.entryPath));

                if (!fileManager.isPathAbsolute(newFileInfo.rootpath) && fileManager.alwaysMakePathsAbsolute()) {
                    newFileInfo.rootpath = fileManager.join(newFileInfo.entryPath, newFileInfo.rootpath);
                }
            }
            newFileInfo.filename = resolvedFilename;

            /** Create an inherited context with processImports=false */
            
            context.options.processImports = false;

            importManager.contents[resolvedFilename] = contents;

            if (currentFileInfo.reference || importOptions.reference) {
                newFileInfo.reference = true;
            }

            if (importOptions.isPlugin) {
                plugin = pluginLoader.evalPlugin(contents, context, importManager, importOptions.pluginArgs, newFileInfo);
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
                    Parser(context, importManager, newFileInfo).parse(contents, function (e, root) {
                        fileParsedFunc(e, root, resolvedFilename);
                    });
                }
            }
        };
        let loadedFile;
        let promise;
        const options = context.options;

        if (tryAppendExtension) {
            options.ext = importOptions.isPlugin ? '.js' : '.less';
        }

        /**
         * @todo - rewrite when `@plugin` is removed
         */
        if (importOptions.isPlugin) {
            options.mime = 'application/javascript';

            if (options.syncImport) {
                loadedFile = pluginLoader.loadPluginSync(path, currentFileInfo.currentDirectory, context, environment, fileManager);
            } else {
                promise = pluginLoader.loadPlugin(path, currentFileInfo.currentDirectory, context, environment, fileManager);
            }
        }
        else {
            if (options.syncImport) {
                loadedFile = fileManager.loadFileSync(path, currentFileInfo.currentDirectory, context, environment);
            } else {
                promise = fileManager.loadFile(path, currentFileInfo.currentDirectory, context, environment,
                    (err, loadedFile) => {
                        if (err) {
                            fileParsedFunc(err);
                        } else {
                            loadFileCallback(loadedFile);
                        }
                    });
            }
        }
        if (loadedFile) {
            if (!loadedFile.filename) {
                fileParsedFunc(loadedFile);
            } else {
                loadFileCallback(loadedFile);
            }
        } else if (promise) {
            promise.then(loadFileCallback, fileParsedFunc);
        }
    }
}

export default function(environment) {
    ImportManager.prototype.environment = environment;
    return ImportManager;
}
    
