import Node from './node';
const _noSpaceCombinators = {
    '': true,
    ' ': true,
    '|': true
};

class Combinator extends Node {
    type: 'Combinator'
    value: string

    constructor(value: string) {
        const isSpace = value === ' '
        super(
            isSpace ? value : (value ? value.trim() : ''),
            {
                emptyOrWhitespace: isSpace || value === ''
            }
        )
    }

    genCSS(context, output) {
        const spaceOrEmpty = (context.compress || _noSpaceCombinators[this.value]) ? '' : ' ';
        output.add(spaceOrEmpty + this.value + spaceOrEmpty);
    }
}

Combinator.prototype.type = 'Combinator'

export default Combinator;
