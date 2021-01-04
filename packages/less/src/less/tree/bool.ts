import Node, { OutputCollector } from './node';
import type { Context } from '../contexts';

/**
 * A boolean keyword, or a boolean result
 * (such as the result of a comparison)
 */
class Bool extends Node {
    type: 'Bool'

    genCSS(context: Context, output: OutputCollector) {
        output.add(this.value.toString());
    }
}

Bool.prototype.type = 'Bool';

export default Bool;
