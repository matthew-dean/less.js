import Node, { NodeArgs, OutputCollector } from './node';
import type { Context } from '../contexts';

type V1Args = [
    key: string,
    val: Node | string
]

class Assignment extends Node {
    nodes: [string, Node | string]
    type: 'Assignment'

    constructor(...args: V1Args | NodeArgs) {
        const val = args[1]
        if (val instanceof Node || typeof val === 'string') {
            super([args[0], args[1]]);
            return
        }
        super(...(<NodeArgs>args));
    }

    genCSS(context: Context, output: OutputCollector) {
        const [key, val] = this.nodes;
        output.add(`${key}=`);
        if (val instanceof Node) {
            val.genCSS(context, output);
        } else {
            output.add(val);
        }
    }
}

Assignment.prototype.type = 'Assignment';

export default Assignment;
