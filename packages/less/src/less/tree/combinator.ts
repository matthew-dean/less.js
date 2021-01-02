import Node, { IFileInfo, ILocationInfo, INodeOptions } from './node';
import type { Context } from '../contexts';
const _noSpaceCombinators = {
    '': true,
    ' ': true,
    '|': true
};

class Combinator extends Node {
    type: 'Combinator'
    nodes: string

    constructor(
        value: string,
        options?: INodeOptions,
        location?: ILocationInfo,
        fileInfo?: IFileInfo
    ) {
        super(
            value === ' ' ? value : (value ? value.trim() : ''),
            options,
            location,
            fileInfo
        );
    }

    get emptyOrWhitespace() {
        const val = this.nodes;
        return val === ' ' || val === '';
    }

    genCSS(context: Context, output) {
        const spaceOrEmpty = (context?.options.compress || _noSpaceCombinators[this.nodes]) ? '' : ' ';
        output.add(spaceOrEmpty + this.nodes + spaceOrEmpty);
    }
}

Combinator.prototype.type = 'Combinator';

export default Combinator;
