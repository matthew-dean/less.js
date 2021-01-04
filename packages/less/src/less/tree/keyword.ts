import { Context } from '../contexts';
import Node, { isNodeArgs, NodeArgs, OutputCollector } from './node';

type V1Args = [
    value: string
];
class Keyword extends Node {
    type: 'Keyword'
    value: string

    static True = new Keyword('true');
    static False = new Keyword('false');

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }
        super({ value: args[0] });
    }

    genCSS(context: Context, output: OutputCollector) {
        const value = this.value;
        if (value === '%') {
            throw { type: 'Syntax', message: 'Invalid % without number' };
        }
        output.add(value);
    }
}

Keyword.prototype.type = 'Keyword';

export default Keyword;
