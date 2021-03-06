import {
  Bool,
  Context,
  Condition,
  Node,
  INodeOptions,
  ILocationInfo,
  List,
  Null,
  SelectorList,
  Selector,
  Rules,
  Expression
} from '.'

export type IRulesetProps = {
  selectors: SelectorList | Selector[]
  rules: Rules
  condition?: Condition
}

/**
 * This is what's known as a "qualified rule" in the CSS spec,
 * but no-one uses that term, so in Less, we call this a generic 'Ruleset'
 * (a set of rules)
 *   i.e. selector(s) with a rules block (`.a { b: c; }`)
 *
 * In Less, it may also have a condition node.
 */
export class Ruleset extends Node {
  rules: Rules
  selectors: SelectorList
  condition: Bool | Condition | undefined

  constructor(props: IRulesetProps, options?: INodeOptions, location?: ILocationInfo) {
    const { selectors } = props
    if (
      selectors
      && Array.isArray(selectors) && (selectors.length !== 1 || selectors[0] instanceof Expression)
    ) {
      props.selectors = new List<Selector>(<Selector[]>selectors)
    }
    super(props, options, location)
  }

  toString(omitPrePost?: boolean) {
    let text = this.selectors.toString() + this.rules.toString()
    if (omitPrePost) {
      return text
    }
    return this.pre + text + this.post
  }

  eval(context: Context): Ruleset | Null {
    if (!this.evaluated) {
      this.evaluated = true

      /**
       * The underlying Expression / Element implementations should merge selectors
       */
      const selectorList = this.selectors.eval(context)
      this.selectors = selectorList

      // currrent selectors
      let ctxSelectors = context.selectors
      ctxSelectors.unshift(selectorList)

      let condition = this.condition

      if (condition && condition instanceof Condition) {
        condition = condition.eval(context)
        this.condition = condition

        if (condition.valueOf() === false) {
          return new Null().inherit(this)
        }
      }

      this.rules = this.rules.eval(context)

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

Ruleset.prototype.type = 'Ruleset'
Ruleset.prototype.evalFirst = true
