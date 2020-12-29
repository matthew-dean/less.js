import Node from './node';

class Keyword extends Node {
    type: 'Keyword'
    value: string

    static True = new Keyword('true');
    static False = new Keyword('false');

    constructor(value: string) {
        super(value);
    }

    genCSS(context, output) {
        if (this.value === '%') { throw { type: 'Syntax', message: 'Invalid % without number' }; }
        output.add(this.value);
    }
}

Keyword.prototype.type = 'Keyword';

export default Keyword;
