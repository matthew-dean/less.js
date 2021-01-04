import Node from './node';

/**
 * Legacy unit type that's not needed
 * 
 * @todo - remove?
 */
class Unit extends Node {
    type: 'Unit'
    value: string

    constructor(numerator: string[]) {
        super({ value: numerator[0] });
    }
}

Unit.prototype.type = 'Unit';
export default Unit;
