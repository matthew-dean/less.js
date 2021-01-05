import Node, { isNodeArgs, NodeArgs, OutputCollector } from './node';
import type { Context } from '../contexts';

type V1Args = [
    key: string | Node,
    op: string,
    value: string | Node
]
class Attribute extends Node {
    type: 'Attribute'
    key: string | Node
    op: string
    value: string | Node
    
    constructor(...args: V1Args | NodeArgs) {
        if (isNodeArgs(args)) {
            super(...args);
        } else {
            const [key, op, value] = args;
            super({ key, op, value });
        }
    }


    genCSS(context: Context, output: OutputCollector) {
        output.add(this.toCSS(context));
    }

    toCSS(context: Context) {
        const { key, op, value } = this;
        let output = key instanceof Node ? key.toCSS(context) : key;

        if (op) {
            output += op;
            output += value instanceof Node ? value.toCSS(context) : value;
        }

        return `[${output}]`;
    }
}

Attribute.prototype.type = 'Attribute';

export default Attribute;
