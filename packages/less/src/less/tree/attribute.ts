import Node, { NodeArgs, OutputCollector } from './node';
import type { Context } from '../contexts';

type V1Args = [
    key: string | Node,
    op: string,
    value: string | Node
]
class Attribute extends Node {
    type: 'Attribute'
    nodes: [string | Node, string, string | Node]
    
    constructor(...args: V1Args | NodeArgs) {
        const val = args[1]
        if (typeof val === 'string') {
            super([args[0], val, args[2]]);
            return
        }
        super(...(<NodeArgs>args));
    }

    get key() {
        return this.nodes[0]
    }

    get op() {
        return this.nodes[1]
    }

    get value() {
        return this.nodes[2]
    }

    genCSS(context: Context, output: OutputCollector) {
        output.add(this.toCSS(context));
    }

    toCSS(context: Context) {
        const [key, op, value] = this.nodes
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
