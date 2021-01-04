import Node, { OutputCollector } from './node';
import type { Context } from '../contexts';

/**
 * A (comma) separated list of nodes.
 * 
 * This can be a selector, a CSS value,
 * or function arguments.
 */
class List<T extends Node = Node> extends Node {
    type: 'List'
    value: T[]

    constructor(value) {
        if (!Array.isArray(value)) {
            value = [ value ];
        }
        super({ value });
    }

    eval(context: Context) {
        if (this.value.length === 1) {
            return this.value[0].eval(context);
        } else {
            return super.eval(context);
        }
    }

    genCSS(context: Context, output: OutputCollector) {
        this.value.forEach((val, i) => {
            val.genCSS(context, output);
            if (i + 1 < this.value.length) {
                output.add((context && context.options.compress) ? ',' : ', ');
            }
        });
    }
}

List.prototype.type = 'List';

export default List;
