import Node, { IFileInfo, ILocationInfo, INodeOptions, isNodeArgs } from './node';
import type { Context } from '../contexts';
const _noSpaceCombinators = {
    '': true,
    ' ': true,
    '|': true
};

class Combinator extends Node {
    type: 'Combinator'
    value: string

    constructor(
        value: string,
        options?: INodeOptions,
        location?: ILocationInfo,
        fileInfo?: IFileInfo
    ) {
        super(
            value === ' ' ? { value } : { value: (value ? value.trim() : '') },
            options,
            location,
            fileInfo
        );
    }

    get emptyOrWhitespace() {
        const val = this.value;
        return val === ' ' || val === '';
    }

    genCSS(context: Context, output) {
        const spaceOrEmpty = (context?.options.compress || _noSpaceCombinators[this.value]) ? '' : ' ';
        output.add(spaceOrEmpty + this.value + spaceOrEmpty);
    }
}

Combinator.prototype.type = 'Combinator';

export default Combinator;
