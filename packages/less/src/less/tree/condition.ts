import Node, { NodeArgs } from './node';

type V1Args = [
    op: string,
    left: Node,
    right: Node,
    index: number,
    negate: boolean
]

class Condition extends Node {
    type: 'Condition'

    nodes: [string, Node, Node]
    constructor(...args: V1Args | NodeArgs) {
        if (args[1] instanceof Node) {
            let [op, l, r, i, negate] = <V1Args>args
            super(
                [op.trim(), l, r],
                { negate },
                i
            );
            return;
        }
        super(...(<NodeArgs>args))
    }
    get op() {
        return this.nodes[0]
    }
    get lvalue() {
        return this.nodes[1]
    }
    get rvalue() {
        return this.nodes[2]
    }

    eval(context) {
        const [op, l, r] = this.nodes;
        const a = l.eval(context);
        const b = r.eval(context);

        const result = (function (op, a, b) {
            switch (op) {
                case 'and': return a && b;
                case 'or':  return a || b;
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

        return this.options.negate ? !result : result;
    }
}

Condition.prototype.type = 'Condition';

export default Condition;
