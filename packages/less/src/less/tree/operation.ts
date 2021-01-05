import Node, { isNodeArgs, INodeOptions, ILocationInfo, IFileInfo, OutputCollector } from './node';
import { Color, Dimension } from '.';
import * as Constants from '../constants';
import { Context } from '../contexts';
const MATH = Constants.Math;

type V1Args = [
    op: string,
    operands: [Node, Node],
    isSpaced?: boolean
]

type OperationArgs = [
    nodes: {
        op: string,
        operands: [Node, Node]
    },
    options?: INodeOptions,
    location?: ILocationInfo,
    fileInfo?: IFileInfo
]

class Operation extends Node {
    type: 'Operation'
    op: string;
    operands: [Node, Node];

    constructor(...args: OperationArgs | V1Args) {
        if (isNodeArgs(args)) {
            args[0].op = args[0].op.trim()
            super(...args);
        } else {
            let [
                op,
                operands,
                isSpaced
            ] = <V1Args>args;
            op = op.trim();

            super({ op, operands }, { isSpaced });
        }
    }

    eval(context: Context) {
        let { op, operands } = this;
        let a: Dimension | Color | Node = operands[0].eval(context);
        let b: Dimension | Color | Node  = operands[1].eval(context);

        if (context.isMathOn(op)) {
            op = op === './' ? '/' : op;
            if (a instanceof Dimension && b instanceof Color) {
                a = a.toColor();
            }
            if (b instanceof Dimension && a instanceof Color) {
                b = b.toColor();
            }
            if (!('operate' in a)) {
                if (a instanceof Operation && a.op === '/' && context.options.math === MATH.PARENS_DIVISION) {
                    return new Operation({ op, operands: [a, b] }, this.options).inherit(this);
                }
                throw {
                    type: 'Operation',
                    message: 'Operation on an invalid type',
                    index: this.getIndex(),
                    filename: this.fileInfo.filename
                };
            }

            return a.operate(context, op, b).inherit(this);
        } else {
            return new Operation({ op, operands: [a, b] }, this.options).inherit(this);
        }
    }

    genCSS(context: Context, output: OutputCollector) {
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
