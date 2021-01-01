import Node, {
    INodeOptions,
    isNodeArgs,
    NodeArgs,
    OutputCollector
} from './node';
import { List, Comment } from '.';
import type { Context } from '../contexts';
import * as Constants from '../constants';
const MATH = Constants.Math;

type V1Args = [
    value: Node[],
    noSpacing?: boolean
]
class Expression extends Node {
    type: 'Expression'
    nodes: Node[]
    options: INodeOptions & {
        noSpacing: boolean
    }

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }
        const [value, noSpacing] = args;

        if (!value) {
            throw new Error('Expression requires an array parameter');
        }
        super(value, { noSpacing });
    }

    /**
     * If an evaluated Node in an expression returns a list (such as Element),
     * then we need to merge the list with the surrounding nodes.
     *
     * We also flatten expressions within expressions to be a flat node list.
     */
    eval(context: Context): Expression | List | Node {
        if (!this.evaluated) {
            super.eval(context);

            const expressions: Expression[] = [];

            const processNodes = (expr: Node) => {
                let nodes = expr.nodes;
                let nodesLength = nodes.length;
                for (let i = 0; i < nodesLength; i++) {
                    const node = nodes[i];
                    if (node instanceof List) {
                        node.nodes.forEach((listItem: Node) => {
                            const newNodes: Node[] = nodes.map((n: Node, x) => {
                                if (x === i) {
                                    return;
                                }
                                return n.clone();
                            });
                            newNodes[i] = listItem.clone();
                            expressions.push(new Expression(newNodes));
                        });
                        expressions.forEach(expr => {
                            processNodes(expr);
                        });
                        break;
                    } else if (node instanceof Expression) {
                        /** Flatten sub-expressions */
                        const exprNodes = node.nodes;
                        const exprNodesLength = exprNodes.length;
                        nodes = nodes
                            .splice(0, i)
                            .concat(exprNodes)
                            .concat(nodes.splice(i + 1));
                        expr.nodes = nodes;
                        nodesLength += exprNodesLength;
                        i += exprNodesLength;
                        processNodes(node);
                    }
                }
            };

            processNodes(this);

            const numExpressions = expressions.length;

            this.evaluated = true;
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

    genCSS(context: Context, output: OutputCollector) {
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].genCSS(context, output);
            if (!this.options.noSpacing && i + 1 < this.nodes.length) {
                output.add(' ');
            }
        }
    }

    throwAwayComments() {
        this.nodes = this.nodes.filter(function(v) {
            return !(v instanceof Comment);
        });
    }
}

Expression.prototype.type = 'Expression';

export default Expression;
