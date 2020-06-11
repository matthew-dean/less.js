import { Context, Quoted, Url, Node, IProps, ILocationInfo, AtRule, Expression } from '.'

/**
 * @todo - all imports must resolve to a Less AST, even modules.
 *         a module essentially returns Rules<FunctionDefinition[]>
 */

export type IImportProps = {
  path: Quoted | Url
  features?: Node
  content?: null
}

export type IImportOptions = {
  reference?: boolean
  css?: boolean
  less?: boolean
  inline?: boolean
  /** Extension to try to append */
  ext?: string
  /** future feature */
  module?: boolean
  [key: string]: boolean | any
}
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
/**
 * @todo - rewrite the above to make browser importing not a factor
 * Also, the import queue should be loaded during evalImports, not parsing
 */
export class ImportRule extends Node {
  content: Node | null
  features: Node | undefined
  path: Quoted | Url
  options: IImportOptions
  location: ILocationInfo

  /**
   * Note that when an import is added to the import queue, it's eventually passed
   * to the file manager, which may decide to alter the options based on file
   * content or extension. So, for example, by default the Less file manager
   * will treat a `.css` extension as a `css` option, and will set that option
   * on the import node.
   */
  constructor(props: IImportProps, options?: IImportOptions, location?: ILocationInfo) {
    /**
     * We add a null content object, because this.children can't be mutated after
     * the constructor. After the file is resolved, content will be populated either
     * by a single Rules node, or a Value node (such as in the case of inline)
     */
    props.content = null
    super(props, options, location)
  }

  eval(context: Context): AtRule | ImportRule {
    if (!this.evaluated) {
      /**
       * Before we have the _content_ of the @import, we evaluate
       * the statement itself, not the file.
       */
      if (!this.content) {
        super.eval(context)
        if (this.options.css) {
          this.evaluated = true
          return new AtRule(
            {
              pre: this.pre,
              post: this.post,
              name: '@import',
              prelude: new Expression([this.path, this.features]).inherit(this.path)
            },
            {},
            this.location
          ).inherit(this)
        }
        /** @todo - import file and assign to content - in rules eval? */
      } else {
        /**
         * Now we're eval-ing the content only in this context.
         * It's outer statement was eval'd to queue the import.
         */
        this.content.eval(context)
        this.evaluated = true
      }
    }
    return this
  }

  toString() {
    /**
     * When an import is eval'd, if it's Less, this node
     * disappears and returns the Rules node. If it's to be
     * output, then it converts to an AtRule. Meaning, an
     * @import has no final output.
     */
    return ''
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

ImportRule.prototype.type = 'ImportRule'
ImportRule.prototype.allowRoot = true
