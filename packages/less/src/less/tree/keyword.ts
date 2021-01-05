import { Context } from '../contexts';
import Node, { isNodeArgs, NodeArgs, OutputCollector } from './node';

type V1Args = [
    value: string
];
class Keyword extends Node {
    type: 'Keyword'
    value: string

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
            throw {
                type: 'Syntax',
                message: 'Invalid % without number',
                index: this.getIndex(),
                filename: this.fileInfo.filename
            };
        }
        output.add(value);
    }
}

Keyword.prototype.type = 'Keyword';

export default Keyword;
