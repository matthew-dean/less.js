import Node, { IFileInfo, ILocationInfo, INodeOptions, isNodeArgs, NodeCollection } from './node';
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
        value: string | NodeCollection,
        options?: INodeOptions,
        location?: ILocationInfo,
        fileInfo?: IFileInfo
    ) {
        if (isNodeArgs([value])) {
            super(<NodeCollection>value, options, location, fileInfo);
            return;
        }
        super(
            value === ' ' ? { value } : { value: (value ? (<string>value).trim() : '') },
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
        const spaceOrEmpty = (context?.options?.compress || _noSpaceCombinators[this.value]) ? '' : ' ';
        output.add(spaceOrEmpty + this.value + spaceOrEmpty);
    }
}

Combinator.prototype.type = 'Combinator';

export default Combinator;
