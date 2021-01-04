import Node from './node';

/**
 * Used only in Mixin definitions?
 */
class MixinArg extends Node {
  name: string;
  value: Node;

  options: {
    expand: boolean
    variadic: boolean
  }
}
MixinArg.prototype.type = 'MixinArg';
export default MixinArg;