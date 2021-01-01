import Node, { OutputCollector } from './node';
import Operation from './operation';
import Dimension from './dimension';
import type { Context } from '../contexts';

class Negative extends Node {
    type: 'Negative';
    nodes: Node

    genCSS(context: Context, output: OutputCollector) {
        output.add('-');
        this.nodes.genCSS(context, output);
    };

    eval(context: Context) {
        if (context.isMathOn()) {
            return (new Operation('*', [new Dimension(-1), this.value])).eval(context);
        }
        return new Negative(this.value.eval(context));
    }
}

export default Negative;
