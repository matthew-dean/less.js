import Parser from './parser/parser'
import PluginManager from './plugin-api'
import LessError from './less-error'
import { EvalContext } from './tree/contexts'
import { ParseTree } from './parse-tree'
import { AssetManager } from './asset-manager'
import { Less } from './index'

import { ParseFunction, ParseOptions } from './types'

const ParseFactory = (
  less: Less,
  parseTree: typeof ParseTree,
  importManager: typeof AssetManager
) => {
  const parse: ParseFunction = (input: string, options?: ParseOptions, callback?: Function): Promise<any> => {
    options = {...less.options, ...(options || {})}
    if (!callback) {
      return new Promise((resolve, reject) => {
        parse.call(this, input, options, (err, output) => {
          if (err) {
            reject(err)
          } else {
            resolve(output)
          }
        })
      })
    } else {
      const pluginManager = new PluginManager(this, !options.reUsePluginManager);

      options.pluginManager = pluginManager;

      const context = new EvalContext(options);

      if (options.rootFileInfo) {
          rootFileInfo = options.rootFileInfo;
      } else {
          const filename = options.filename || 'input';
          const entryPath = filename.replace(/[^\/\\]*$/, '');
          rootFileInfo = {
              filename,
              rewriteUrls: context.rewriteUrls,
              rootpath: context.rootpath || '',
              currentDirectory: entryPath,
              entryPath,
              rootFilename: filename
          };
          // add in a missing trailing slash
          if (rootFileInfo.rootpath && rootFileInfo.rootpath.slice(-1) !== '/') {
              rootFileInfo.rootpath += '/';
          }
      }

      const imports = new ImportManager(this, context, rootFileInfo);
      this.importManager = imports;

      // TODO: allow the plugins to be just a list of paths or names
      // Do an async plugin queue like lessc

      if (options.plugins) {
          options.plugins.forEach(plugin => {
              let evalResult;
              let contents;
              if (plugin.fileContent) {
                  contents = plugin.fileContent.replace(/^\uFEFF/, '');
                  evalResult = pluginManager.Loader.evalPlugin(contents, context, imports, plugin.options, plugin.filename);
                  if (evalResult instanceof LessError) {
                      return callback(evalResult);
                  }
              }
              else {
                  pluginManager.addPlugin(plugin);
              }
          });
      }

      new Parser(context, imports, rootFileInfo)
        .parse(input, (e, root) => {
            if (e) { return callback(e); }
            callback(null, root, imports, options);
        }, options)
    }
  }
  return parse
}

export default ParseFactory