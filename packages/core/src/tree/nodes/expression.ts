import { Node, NodeArray, Block, Comment, Dimension, List, WS } from ".";

import { EvalContext } from "../contexts";

export type IExpressionOptions = {
    inBlock: boolean;
    blockInOp: boolean;
};

/**
 * An expression is an arbitrary list of nodes,
 * but has two unique properties:
 *   1) It switches the way math is evaluated based on blocks
 *   2) When converted to an array, it discards whitespace and
 *      comments as members of the array.
 */
export class Expression<T extends Node = Node> extends NodeArray {
    options: IExpressionOptions;
    nodes: T[];

    toArray() {
        return this.nodes.filter(
            node => !(node instanceof WS) && !(node instanceof Comment)
        );
    }

    /**
     * If an evaluated Node in an expression returns a list (such as Element),
     * then we need to merge the list with the surrounding nodes.
     */
    eval(context: EvalContext): Expression | List | Node {
        if (!this.evaluated) {
            super.eval(context);

            const expressions: Expression[] = [];

            const processNodes = (nodes: Node[]) => {
                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i];
                    if (node instanceof List) {
                        node.nodes.forEach((listItem: Node) => {
                            const newNodes: Node[] = nodes.map((n: Node, x) => {
                                if (x === i) {
                                    return null;
                                }
                                return n.clone();
                            });
                            newNodes[i] = listItem.clone();
                            expressions.push(new Expression(newNodes));
                        });
                        expressions.forEach(expr => {
                            processNodes(expr.nodes);
                        });
                        break;
                    }
                }
            };

            processNodes(this.nodes);

            const numExpressions = expressions.length;

            if (numExpressions === 0) {
                return this;
            } else if (numExpressions === 1) {
                return expressions[0].inherit(this);
            } else {
                return new List(expressions).inherit(this);
            }
        }
        return this;
    }
    /**
     * @todo - why not just do enter / exit block in the block node?
     */
    // eval(context: EvalContext) {
    //   const { inBlock, blockInOp } = this.options
    //   let returnValue: any
    //   const mathOn = context.isMathOn()

    //   const inParenthesis = inBlock && !blockInOp

    //   let doubleParen = false
    //   if (inParenthesis) {
    //     context.enterBlock()
    //   }
    //   if (this.nodes.length > 1) {
    //     returnValue = super.eval(context)
    //   } else if (this.nodes.length === 1) {
    //     const value = this.nodes[0]
    //     if (
    //       value instanceof Expression &&
    //       value.options.inBlock &&
    //       value.options.blockInOp &&
    //       !context.inCalc
    //     ) {
    //       doubleParen = true
    //     }
    //     returnValue = value.eval(context)
    //     if (returnValue instanceof Node) {
    //       returnValue.inherit(this)
    //     }
    //   } else {
    //     returnValue = this
    //   }
    //   if (inParenthesis) {
    //     context.exitBlock()
    //   }
    //   if (inBlock && blockInOp && !mathOn && !doubleParen
    //     && (!(returnValue instanceof Dimension))) {
    //     returnValue = new Block(returnValue, {}, this.location).inherit(this)
    //   }
    //   return returnValue
    // }

    throwAwayComments() {
        this.nodes = this.nodes.filter(v => !(v instanceof Comment));
    }
}

Expression.prototype.type = "Expression";
