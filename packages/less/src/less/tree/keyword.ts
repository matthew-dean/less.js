import Node from './node';

class Keyword extends Node {
    type: 'Keyword'
    nodes: string

    static True = new Keyword('true');
    static False = new Keyword('false');

    constructor(value: string) {
        super(value);
    }

    genCSS(context, output) {
        const value = this.nodes;
        if (value === '%') {
            throw { type: 'Syntax', message: 'Invalid % without number' };
        }
        output.add(value);
    }
}

Keyword.prototype.type = 'Keyword';

export default Keyword;
