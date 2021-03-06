import {
  Context,
  Node,
  NodeArray,
  Declaration,
  ImportRule,
  EvalReturn,
  ImportantNode,
  Null,
  Ruleset,
  AtRule,
  IProps,
  INodeOptions,
  ILocationInfo
} from '.'

/**
 * A Rules Node is a collection of nodes, usually between `{` `}`.
 * This is also the root node of the AST.
 *
 * e.g.
 *      1. a plain qualified CSS rule [a {b: c}] will have selectors and rules
 *      2. a mixin will have selectors, args, rules, and possibly a guard
 *      3. A variable can be attached to a rules, which will then have no selectors, but can have args
 *
 *  Rules also define a new scope object for variables and functions
 *
 * @todo This should be broken up so that a rules is _just_ the parts between { ... }
 * @todo move selector logic to qualified rule
 */
export class Rules extends NodeArray implements ImportantNode {
  // context: Context
  constructor(props: IProps, options?: INodeOptions, location?: ILocationInfo) {
    super(props, options, location)
  }
  toString() {
    let text: string = ''
    const nodes = this.nodes.filter(node => node.isVisible !== false)
    nodes.forEach((node, i) => {
      const nextNode = nodes[i + 1]
      text += node.toString()
      /**
       * Sanity check, in case something adds a declaration without a
       * semi-colon post-separator.
       */
      if (nextNode && node instanceof Declaration) {
        const post = node.post.toString()
        if (post.indexOf(';') === -1) {
          text += ';'
        }
      }
    })
    return this.pre + text + this.post
  }

  /**
   * This runs before full tree eval. We essentially
   * evaluate the tree enough to determine an import list.
   *
   * ...wait, no, that's not what this does
   */
  evalImports(context: Context) {
    // const rules = this.nodes
    // const numRules = rules.length
    // let importRules: EvalReturn
    // if (!numRules) {
    //   return
    // }
    // for (let i = 0; i < numRules; i++) {
    //   const rule = rules[i]
    //   if (rule instanceof Import) {
    //     importRules = rule.eval(context)
    //     if (Array.isArray(importRules)) {
    //       rules.splice(i, 1, ...importRules)
    //       i += importRules.length - 1
    //     } else {
    //       rules.splice(i, 1, importRules)
    //     }
    //   }
    // }
  }

  eval(context: Context, evalImports?: boolean) {
    /** Shallow clone was here? */
    // const rules = this.clone(true)
    const rules = this
    const ruleset = rules.nodes
    const rulesLength = ruleset.length
    let rule: Node

    /** The first pass of Rules just scans for imports */
    if (evalImports) {
      for (let i = 0; i < rulesLength; i++) {
        rule = rules[i]
        if (rule instanceof ImportRule) {
          const imprt = rule.eval(context)
          rules[i] = imprt
          if (imprt instanceof ImportRule) {
            context.importQueue.push(imprt)
          }
        } else if (rule instanceof Ruleset || rule instanceof AtRule) {
          if (rule.rules) {
            rule.rules.eval(context, evalImports)
          }
        } else if (rule instanceof Rules) {
          rule.eval(context, evalImports)
        }
      }
      return this
    }

    // push the current rules to the frames stack
    // const ctxFrames = context.frames
    // ctxFrames.unshift(rules)

    /** Collect type groups */
    const ruleGroups: {
      imports: [number, Node][]
      first: [number, Node][]
      default: [number, Node][]
    } = {
      imports: [],
      first: [],
      default: []
    }

    const newRules: EvalReturn[] = Array(rulesLength)
    for (let i = 0; i < rulesLength; i++) {
      rule = ruleset[i]
      if (rule instanceof Declaration) {
        rule.evalName(context)
      }
      if (rule instanceof ImportRule) {
        ruleGroups.imports.push([i, rule])
      } else if (rule.evalFirst) {
        ruleGroups.first.push([i, rule])
      } else {
        ruleGroups.default.push([i, rule])
      }
    }

    // Evaluate imports
    if (this.fileRoot === this || !context.options.strictImports) {
      ruleGroups.imports.forEach(([i, node]) => {
        newRules[i] = node.eval(context)
      })
    }

    /** Evaluate early nodes */
    ruleGroups.first.forEach(([i, node]) => {
      newRules[i] = node.eval(context)
    })

    ruleGroups.default.forEach(([i, node]) => {
      newRules[i] = node.eval(context)
    })

    let replaceRules: Node[] = []
    /** Flatten newRules list */
    newRules.forEach((rule: EvalReturn) => {
      if (rule) {
        if (Array.isArray(rule)) {
          replaceRules = replaceRules.concat(rule)
        } else if (!(rule instanceof Null)) {
          replaceRules.push(rule)
        }
      }
    })
    replaceRules.forEach(rule => this.inheritChild(rule))

    rules.nodes = replaceRules

    // Store the frames around mixin definitions,
    // so they can be evaluated like closures when the time comes.

    /** @removed - special mixin call / variable call evals */

    // Evaluate everything else
    /** @removed - merging in & { } */

    // Pop the stack
    // ctxFrames.shift()
    // ctxSelectors.shift()

    /** Restore original scope */
    // context.scope = currentScope

    return rules
  }

  makeImportant(): this {
    this.nodes.forEach(node => {
      if (node.hasOwnProperty('makeImportant')) {
        ;(<ImportantNode>node).makeImportant()
      }
    })

    return this
  }

  private _find(name: string = '', filterType: boolean | null = null) {
    const nodes = this.nodes
    const nodeLength = this.nodes.length
    for (let i = nodeLength; i > 0; i--) {
      const node = nodes[i - 1]
      if (node instanceof Declaration &&
        (name === '' || node.name.toString() === name) &&
        (filterType === null || node.options.isVariable === filterType)
      ) {
        return node
      }
    }
  }

  lastDeclaration() {
    return this._find()
  }

  variable(name: string) {
    return this._find(name, true)
  }

  property(name: string) {
    return this._find(name, false)
  }

  getRules() {
    return this.nodes.filter((node: Node) => {
      return node instanceof Rules
    })
  }

  prependRule(rule: Node) {
    this.prependNode(this.nodes, rule)
  }

  appendRule(rule: Node) {
    this.appendNode(this.nodes, rule)
  }

  // find(selector, self = this, filter) {
  //     const rules = [];
  //     let match;
  //     let foundMixins;
  //     const key = selector.toCSS();

  //     if (key in this._lookups) { return this._lookups[key]; }

  //     this.getRules().forEach(rule => {
  //         if (rule !== self) {
  //             for (let j = 0; j < rule.selectors.length; j++) {
  //                 match = selector.match(rule.selectors[j]);
  //                 if (match) {
  //                     if (selector.elements.length > match) {
  //                         if (!filter || filter(rule)) {
  //                             foundMixins = rule.find(new Selector(selector.elements.slice(match)), self, filter);
  //                             for (let i = 0; i < foundMixins.length; ++i) {
  //                                 foundMixins[i].path.push(rule);
  //                             }
  //                             Array.prototype.push.apply(rules, foundMixins);
  //                         }
  //                     } else {
  //                         rules.push({ rule, path: []});
  //                     }
  //                     break;
  //                 }
  //             }
  //         }
  //     });
  //     this._lookups[key] = rules;
  //     return rules;
  // }

  // genCSS(context, output) {
  //     let i;
  //     let j;
  //     const charsetRuleNodes = [];
  //     let ruleNodes = [];

  //     let // Line number debugging
  //         debugInfo;

  //     let rule;
  //     let path;

  //     context.tabLevel = (context.tabLevel || 0);

  //     if (!this.root) {
  //         context.tabLevel++;
  //     }

  //     const tabRuleStr = context.compress ? '' : Array(context.tabLevel + 1).join('  ');
  //     const tabSetStr = context.compress ? '' : Array(context.tabLevel).join('  ');
  //     let sep;

  //     let charsetNodeIndex = 0;
  //     let importNodeIndex = 0;
  //     for (i = 0; (rule = this.rules[i]); i++) {
  //         if (rule instanceof Comment) {
  //             if (importNodeIndex === i) {
  //                 importNodeIndex++;
  //             }
  //             ruleNodes.push(rule);
  //         } else if (rule.isCharset && rule.isCharset()) {
  //             ruleNodes.splice(charsetNodeIndex, 0, rule);
  //             charsetNodeIndex++;
  //             importNodeIndex++;
  //         } else if (rule.type === 'Import') {
  //             ruleNodes.splice(importNodeIndex, 0, rule);
  //             importNodeIndex++;
  //         } else {
  //             ruleNodes.push(rule);
  //         }
  //     }
  //     ruleNodes = charsetRuleNodes.concat(ruleNodes);

  //     // If this is the root node, we don't render
  //     // a selector, or {}.
  //     if (!this.root) {
  //         debugInfo = getDebugInfo(context, this, tabSetStr);

  //         if (debugInfo) {
  //             output.add(debugInfo);
  //             output.add(tabSetStr);
  //         }

  //         const paths = this.paths;
  //         const pathCnt = paths.length;
  //         let pathSubCnt;

  //         sep = context.compress ? ',' : (`,\n${tabSetStr}`);

  //         for (i = 0; i < pathCnt; i++) {
  //             path = paths[i];
  //             if (!(pathSubCnt = path.length)) { continue; }
  //             if (i > 0) { output.add(sep); }

  //             context.firstSelector = true;
  //             path[0].genCSS(context, output);

  //             context.firstSelector = false;
  //             for (j = 1; j < pathSubCnt; j++) {
  //                 path[j].genCSS(context, output);
  //             }
  //         }

  //         output.add((context.compress ? '{' : ' {\n') + tabRuleStr);
  //     }

  //     // Compile rules
  //     for (i = 0; (rule = ruleNodes[i]); i++) {

  //         if (i + 1 === ruleNodes.length) {
  //             context.lastRule = true;
  //         }

  //         const currentLastRule = context.lastRule;
  //         if (rule.isRulesLike(rule)) {
  //             context.lastRule = false;
  //         }

  //         if (rule.genCSS) {
  //             rule.genCSS(context, output);
  //         } else if (rule.value) {
  //             output.add(rule.value.toString());
  //         }

  //         context.lastRule = currentLastRule;

  //         if (!context.lastRule && rule.isVisible()) {
  //             output.add(context.compress ? '' : (`\n${tabRuleStr}`));
  //         } else {
  //             context.lastRule = false;
  //         }
  //     }

  //     if (!this.root) {
  //         output.add((context.compress ? '}' : `\n${tabSetStr}}`));
  //         context.tabLevel--;
  //     }

  //     if (!output.isEmpty() && !context.compress && this.firstRoot) {
  //         output.add('\n');
  //     }
  // }
}

Rules.prototype.type = 'Rules'
