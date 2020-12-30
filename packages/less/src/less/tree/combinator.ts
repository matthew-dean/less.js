import Node, { IFileInfo, ILocationInfo, INodeOptions } from './node';
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
            value === ' ' ? value : (value ? value.trim() : ''),
            options,
            location,
            fileInfo
        )
    }

    get emptyOrWhitespace() {
        const val = this.value;
        return val === ' ' || val === '';
    }

    genCSS(context, output) {
        const spaceOrEmpty = (context.compress || _noSpaceCombinators[this.value]) ? '' : ' ';
        output.add(spaceOrEmpty + this.value + spaceOrEmpty);
    }
}

Combinator.prototype.type = 'Combinator'

export default Combinator;
