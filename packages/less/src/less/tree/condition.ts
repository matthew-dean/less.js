import Node, { NodeArgs } from './node';
import { Bool } from '.';

type V1Args = [
    op: string,
    left: Node,
    right: Node,
    index: number,
    negate: boolean
]

class Condition extends Node {
    type: 'Condition'
    op: string;
    lvalue: Node;
    rvalue: Node;

    constructor(...args: V1Args | NodeArgs) {
        if (args[1] instanceof Node) {
            let [op, lvalue, rvalue, i, negate] = <V1Args>args;
            super(
                { op: op.trim(), lvalue, rvalue },
                { negate },
                i
            );
            return;
        }
        super(...(<NodeArgs>args));
    }

    eval(context) {
        const { op, lvalue, rvalue } = this;
        const a = lvalue.eval(context);
        const b = rvalue.eval(context);

        const result = (function (op, a, b) {
            switch (op) {
                case 'and': return a.value && b.value;
                case 'or':  return a.value || b.value;
                default:
                    switch (Node.compare(a, b)) {
                        case -1:
                            return op === '<' || op === '=<' || op === '<=';
                        case 0:
                            return op === '=' || op === '>=' || op === '=<' || op === '<=';
                        case 1:
                            return op === '>' || op === '>=';
                        default:
                            return false;
                    }
            }
        })(op, a, b);

        return new Bool({ value: this.options.negate ? !result : result });
    }
}

Condition.prototype.type = 'Condition';

export default Condition;
