import {
  Node,
  IProps,
  ILocationInfo,
  Rules,
  AtRule,
  Expression
} from '.'

import { Context } from '../context'

/**
 * @todo - all imports must resolve to a Less AST, even modules.
 *         a module essentially returns Rules<FunctionDefinition[]>
 */
//
// CSS @import node
//
// The general strategy here is that we don't want to wait
// for the parsing to be completed, before we start importing
// the file. That's because in the context of a browser,
// most of the time will be spent waiting for the server to respond.
//
// On creation, we push the import path to our import queue, though
// `import,push`, we also pass it a callback, which it'll call once
// the file has been fetched, and parsed.
//
export type IImportOptions = {
  reference?: boolean
  css?: boolean
  less?: boolean
  inline?: boolean
  js?: boolean
  [key: string]: boolean | any
}
/**
 * @todo - rewrite the above to make browser importing not a factor
 * Also, the import queue should be loaded during evalImports, not parsing
 */
export class Import extends Node {
  content: [Node] | []
  features: [Node] | undefined
  path: [Node]
  options: IImportOptions

  /**
   * Note that when an import is added to the import queue, it's eventually passed 
   * to the file manager, which may decide to alter the options based on file
   * content or extension. So, for example, by default the Less file manager
   * will treat a `.css` extension as a `css` option, and will set that option
   * on the import node.
   */
  constructor(props: IProps, options: IImportOptions, location: ILocationInfo) {
    /**
     * We add an empty content object, because this.children can't be mutated after
     * the constructor. After the file is resolved, content will be populated either
     * by a single Rules node, or a Value node (such as in the case of inline)
     */
    props.content = []
    super(props, options, location)
  }

  eval(context: Context): AtRule | Import {
    if (!this.evaluated) {
      if (this.content.length === 0) {
        super.eval(context)
        if (this.options.css) {
          this.evaluated = true
          return new AtRule({
            pre: this.pre,
            post: this.post,
            name: '@import',
            prelude: [new Expression(this.path.concat(this.features)).inherit(this.path[0])]
          }, {}, this.location).inherit(this)
        }
      } else {
        this.content[0].eval(context)
        this.evaluated = true
      }
    }
    return this
  }

  toString() {
    return this.content[0].toString()
  }

  // eval(context: Context) {
  //   const hasContent = this.content.length === 1
  //   if (hasContent) {
  //     if (this.options.reference || !this.isVisible) {
  //       const rules = this.content[0].nodes
  //       rules.forEach((rule: Node) => {
  //         rule.isVisible = false
  //       })
  //     }
  //   }

  //   super.eval(context)

  //   if (!hasContent) {
  //     return this
  //   }

  //   if (this.options.isModule) {
  //     // context.
  //   }
  //       if (this.root && this.root.eval) {
  //           try {
  //               this.root.eval(context);
  //           }
  //           catch (e) {
  //               e.message = 'Plugin error during evaluation';
  //               throw new LessError(e, this.root.imports, this.root.filename);
  //           }
  //       }
  //       registry = context.frames[0] && context.frames[0].functionRegistry;
  //       if ( registry && this.root && this.root.functions ) {
  //           registry.addMultiple( this.root.functions );
  //       }

  //       // return [];
  

  //       if (this.skip) {
  //           if (typeof this.skip === 'function') {
  //               this.skip = this.skip();
  //           }
  //           if (this.skip) {
  //               return [];
  //           }
  //       }
  //       if (this.options.inline) {
  //           const contents = new Anonymous(this.root, 0,
  //               {
  //                   filename: this.importedFilename,
  //                   reference: this.path._fileInfo && this.path._fileInfo.reference
  //               }, true, true);

  //           return this.features ? new Media([contents], this.features.value) : [contents];
  //       } else if (this.css) {
  //           const newImport = new Import(this.evalPath(context), features, this.options, this._index);
  //           if (!newImport.css && this.error) {
  //               throw this.error;
  //           }
  //           return newImport;
  //       } else {
  //           rules = new Rules(null, utils.copyArray(this.root.rules));
  //           rules.evalImports(context);

  //           return this.features ? new Media(rules.rules, this.features.value) : rules.rules;
  //       }
  //   }
}

Import.prototype.type = 'Import'
Import.prototype.allowRoot = true
