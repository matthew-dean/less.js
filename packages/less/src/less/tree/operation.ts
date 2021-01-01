import Node, { NodeArgs, NumericNode } from './node';
import { Color, Dimension } from '.';
import * as Constants from '../constants';
const MATH = Constants.Math;

type V1Args = [
    op: string,
    operands: Node[],
    isSpaced?: boolean
]
class Operation extends Node {
    type: 'Operation'
    nodes: [string, Node | NumericNode, Node | NumericNode]

    constructor(...args: NodeArgs | V1Args) {
        if (Array.isArray(args[0])) {
            super(...(<NodeArgs>args));
            return;
        }
        const [
            op,
            operands,
            isSpaced
        ] = <V1Args>args;

        super([op, ...operands], { isSpaced });
    }

    get op() {
        return this.nodes[0];
    }

    get operands() {
        const [_, l, r] = this.nodes;
        return [l, r];
    }

    eval(context) {
        let [op, a, b] = this.nodes;
        a = this.nodes[1].eval(context);
        b = this.nodes[2].eval(context);

        if (context.isMathOn(op)) {
            op = op === './' ? '/' : op;
            if (a instanceof Dimension && b instanceof Color) {
                a = a.toColor();
            }
            if (b instanceof Dimension && a instanceof Color) {
                b = b.toColor();
            }
            if (!('operate' in a)) {
                if (a instanceof Operation && a.op === '/' && context.math === MATH.PARENS_DIVISION) {
                    return new Operation([op, a, b], this.options).inherit(this);
                }
                throw { type: 'Operation',
                    message: 'Operation on an invalid type' };
            }

            return a.operate(context, op, b).inherit(this);
        } else {
            return new Operation([op, a, b], this.options).inherit(this);
        }
    }

    genCSS(context, output) {
        this.operands[0].genCSS(context, output);
        if (this.options.isSpaced) {
            output.add(' ');
        }
        output.add(this.op);
        if (this.options.isSpaced) {
            output.add(' ');
        }
        this.operands[1].genCSS(context, output);
    }
}

Operation.prototype.type = 'Operation';

export default Operation;
