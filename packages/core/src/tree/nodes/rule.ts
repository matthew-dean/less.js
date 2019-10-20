import {
  Node,
  INodeOptions,
  ILocationInfo,
  IProps,
  Rules,
  List,
  SelectorList,
  Selector,
  Expression,
  WS,
  Op,
  Comment
} from '.'

import { Context } from '../context'

export type IRuleProps = {
  selectors: [SelectorList] | Selector[]
  rules: [Rules],
  condition?: [Node]
}

/**
 * This is what's known as a "qualified rule" in the CSS spec,
 * but no-one uses that term, so we just call this the generic 'Rule'
 *   i.e. selector(s) with a rules block (`.a { b: c; }`)
 * 
 * In Less, it may also have a condition node.
 */
export class Rule extends Node {
  rules: [Rules]
  selectors: [SelectorList]
  condition: [Node] | undefined

  constructor(props: IRuleProps, options: INodeOptions, location: ILocationInfo) {
    const { selectors } = props
    if (selectors && (selectors.length !== 1 || selectors[0] instanceof Expression)) {
      props.selectors = [new List<Selector>(<Selector[]>selectors)]
    }
    super(props, options, location)
  }

  toString(omitPrePost?: boolean) {
    let text = this.selectors[0].toString() + this.rules[0].toString()
    if (omitPrePost) {
      return text
    }
    return this.pre + text + this.post
  }

  eval(context: Context) {
    if (!this.evaluated) {
      this.evaluated = true

      /**
       * The underlying Expression / Element implementations should merge selectors
       */
      const selectorList = this.selectors[0].eval(context)
      this.selectors = [selectorList]

      // currrent selectors
      let ctxSelectors = context.selectors
      ctxSelectors.unshift(selectorList)

      const evalFunc = (node: Node) => node.eval(context)

      if (this.condition && this.condition.length === 1) {
        this.processNodeArray(this.condition, evalFunc)

        if (this.condition[0].valueOf() === false) {
          return false
        }
      }

      this.processNodeArray(this.rules, evalFunc)

      /** Restore context selectors to initial state */
      ctxSelectors.shift()

      // let selCnt: number
      // let selector: Node
      // let i: number
      // let hasVariable: boolean
      // let hasOnePassingSelector: boolean = false;

      // if (this.children.selectors && (selCnt = this.children.selectors.length)) {
      // selectors = new Array(selCnt)
      // defaultFunc.error({
      //     type: 'Syntax',
      //     message: 'it is currently only allowed in parametric mixin guards,'
      // })

      // for (i = 0; i < selCnt; i++) {
      //     selector = this.selectors[i].eval(context)
      //     for (var j = 0; j < selector.elements.length; j++) {
      //         if (selector.elements[j].isVariable) {
      //             hasVariable = true
      //             break;
      //         }
      //     }
      //     selectors[i] = selector;
      //     if (selector.evaldCondition) {
      //         hasOnePassingSelector = true;
      //     }
      // }

      // if (hasVariable) {
      //     const toParseSelectors = new Array(selCnt);
      //     for (i = 0; i < selCnt; i++) {
      //         selector = selectors[i];
      //         toParseSelectors[i] = selector.toCSS(context);
      //     }
      // }

      // defaultFunc.reset()
      // } else {
      //     hasOnePassingSelector = true
      // }
      // // if (!hasOnePassingSelector) {
      // //   rules.length = 0;
      // // }
      // const { mediaBlocks } = context
      // const mediaBlockCount = (mediaBlocks && mediaBlocks.length) || 0
      // /** Bubble selectors up through rules... move to qualified rules probably */
      
      // if (mediaBlocks) {
      //     for (let i = mediaBlockCount; i < mediaBlocks.length; i++) {
      //     mediaBlocks[i].bubbleSelectors(selectors)
      //     }
      // }
    }
    return this
  }
}

Rule.prototype.type = 'Rule'
Rule.prototype.evalFirst = true
