import Node, { NodeArgs } from './node';

type V1Args = [
    key: string | Node,
    op: string,
    value: string | Node
]
class Attribute extends Node {
    type: 'Attribute'
    value: [string | Node, string, string | Node]
    
    constructor(...args: V1Args | NodeArgs) {
        const val = args[1]
        if (typeof val === 'string') {
            super([args[0], val, args[2]]);
            return
        }
        super(...(<NodeArgs>args));
    }

    get key() {
        return this.value[0]
    }

    get op() {
        return this.value[1]
    }

    genCSS(context, output) {
        output.add(this.toCSS(context));
    }

    toCSS(context) {
        const [key, op, value] = this.value
        let output = key instanceof Node ? key.toCSS(context) : key;

        if (op) {
            output += op;
            output += value instanceof Node ? value.toCSS(context) : value;
        }

        return `[${value}]`;
    }
}

Attribute.prototype.type = 'Attribute';

export default Attribute;
