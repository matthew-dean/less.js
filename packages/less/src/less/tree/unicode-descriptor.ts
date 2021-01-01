import Node from './node';

/**
 * @todo
 * Why is this needed? Is it important to distinguish from
 * an Anonymous node?
 */
class UnicodeDescriptor extends Node {
    type: 'UnicodeDescriptor'
}

UnicodeDescriptor.prototype.type = 'UnicodeDescriptor';
export default UnicodeDescriptor;
