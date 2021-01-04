import Node, { OutputCollector } from './node';
import { Operation, Dimension } from '.';
import type { Context } from '../contexts';

/**
 * @note
 * When the only value passed in is a node,
 * we don't have to define a constructor(),
 * as the Node class can take a single node as a value.
 */
class Negative extends Node {
    type: 'Negative';
    value: Node

    genCSS(context: Context, output: OutputCollector) {
        output.add('-');
        this.value.genCSS(context, output);
    };

    eval(context: Context) {
        if (context.isMathOn()) {
            return (new Operation('*', [new Dimension(-1), this.value])).eval(context);
        }
        return new Negative(this.value.eval(context));
    }
}

Negative.prototype.type = 'Negative';

export default Negative;
