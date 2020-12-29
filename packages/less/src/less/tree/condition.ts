import Node from './node';

class Condition extends Node {
    type: 'Condition'

    value: [string, Node, Node]
    constructor(
        op: string,
        l: Node,
        r: Node,
        i: number,
        negate: boolean
    ) {
        super(
            [op.trim(), l, r],
            { negate },
            i
        )
    }
    get op() {
        return this.value[0]
    }
    get lvalue() {
        return this.value[1]
    }
    get rvalue() {
        return this.value[2]
    }

    eval(context) {
        const [op, l, r] = this.value;
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
