import Node, { isNodeArgs, NodeArgs, OutputCollector } from './node';
import type { Context } from '../contexts';

type V1Args = [
    key: string,
    value: Node | string
]

class Assignment extends Node {
    type: 'Assignment'
    key: string
    value: Node | string

    constructor(...args: V1Args | NodeArgs) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }
        const [key, value] = args;
        super({ key, value });
    }

    genCSS(context: Context, output: OutputCollector) {
        const key = this.key;
        const val = this.value;
        
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
