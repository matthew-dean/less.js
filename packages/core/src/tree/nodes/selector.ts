import { Context, Node, Expression, List, Op, WS } from '.'

export type SelectorList = List<Selector>

// A selector like div .foo@{blah} +/* */ p
//
//  e.g.
//     elements = ['div',' ','.foo',new Variable('@blah'),'+','p']
//     text = 'div.foo[bar] +/* */ p'
//
/**
 * A Selector node is really just an expression wrapper for elements,
 * with some additional processing to merge combinators / whitespace
 */
export class Selector extends Expression {
  mixinCompareValue: string

  eval (context: Context): List<Selector> | Selector {
    if (!this.evaluated) {
      let expressions: Expression[]
      const output: Node = super.eval(context)
      if (output instanceof List) {
        expressions = output.nodes
      } else if (output instanceof Expression) {
        expressions = [output]
      } else {
        expressions = [new Selector([output]).inherit(output)]
      }
      // console.log(expressions[0].nodes)
      expressions.forEach((expr, i) => {
        if (expr instanceof Expression) {
          expr = new Selector(expr.nodes).inherit(expr)
          expressions[i] = expr
        } else {
          expr = new Selector(expr).inherit(expr)
          expressions[i] = expr
        }

        const nodes = expr.nodes
        const nodesLength = nodes.length
        let hasCombinator = false
        for (let i = 0; i < nodesLength; i++) {
          const node = nodes[i]
          if (node instanceof WS || node instanceof Op) {
            if (hasCombinator) {
              nodes.splice(i--, 1)
            } else {
              hasCombinator = true
            }
          } else {
            hasCombinator = false
          }
        }
      })
      if (output instanceof List) {
        return output
      } else {
        return <Selector>expressions[0]
      }
    }
    return this
  }

  /**
   * Reduces `#sel > .val` or `#sel .val` to `#sel.val`
   * so that we can match `#sel.val()`
   */
  getMixinCompareValue (): string {
    let mixinCompareValue = this.mixinCompareValue
    if (!mixinCompareValue) {
      mixinCompareValue = this.nodes
        .map(node => {
          if (node instanceof Op) {
            const val = node.value
            return val === '>' ? '' : val
          }
          return node.valueOf()
        })
        .join('')
      this.mixinCompareValue = mixinCompareValue
    }
    return mixinCompareValue
  }

  valueOf () {
    return this.nodes
      .map(node => {
        return node.valueOf()
      })
      .join('')
  }

  /**
   * @todo - what's the type of 'other'?
   */
  // match(other) {
  //   const elements = this.values
  //   const len = elements.length
  //   let olen: number

  //   other = other.mixinElements()
  //   olen = other.length
  //   if (olen === 0 || len < olen) {
  //     return 0
  //   } else {
  //     for (let i = 0; i < olen; i++) {
  //       if (elements[i].value !== other[i]) {
  //         return 0
  //       }
  //     }
  //   }

  //   return olen // return number of matched elements
  // }

  // mixinElements() {
  //     if (this.mixinElements_) {
  //         return this.mixinElements_;
  //     }

  //     let elements = this.elements.map( v => v.combinator.value + (v.value.value || v.value)).join('').match(/[,&#\*\.\w-]([\w-]|(\\.))*/g);

  //     if (elements) {
  //         if (elements[0] === '&') {
  //             elements.shift();
  //         }
  //     } else {
  //         elements = [];
  //     }

  //     return (this.mixinElements_ = elements);
  // }

  // isJustParentSelector() {
  //     return !this.mediaEmpty &&
  //         this.elements.length === 1 &&
  //         this.elements[0].value === '&' &&
  //         (this.elements[0].combinator.value === ' ' || this.elements[0].combinator.value === '');
  // }

  // eval(context) {
  //     const evaldCondition = this.condition && this.condition.eval(context);
  //     let elements = this.elements;
  //     let extendList = this.extendList;

  //     elements = elements && elements.map(e => e.eval(context));
  //     extendList = extendList && extendList.map(extend => extend.eval(context));

  //     return this.createDerived(elements, extendList, evaldCondition);
  // }

  // genCSS(context, output) {
  //     let i;
  //     let element;
  //     if ((!context || !context.firstSelector) && this.elements[0].combinator.value === '') {
  //         output.add(' ', this.fileInfo(), this.getIndex());
  //     }
  //     for (i = 0; i < this.elements.length; i++) {
  //         element = this.elements[i];
  //         element.genCSS(context, output);
  //     }
  // }

  // getIsOutput() {
  //     return this.evaldCondition;
  // }
}

Selector.prototype.type = 'Selector'
