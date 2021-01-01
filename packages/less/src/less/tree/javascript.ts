import JsEvalNode from './js-eval-node';
import Dimension from './dimension';
import Quoted from './quoted';
import Anonymous from './anonymous';
import { IFileInfo, INodeOptions } from './node';

/**
 * @deprecated
 */
class JavaScript extends JsEvalNode {
    type: 'JavaScript'
    options: {
        escaped: boolean
    }

    constructor(
        str: string,
        escaped: boolean | INodeOptions,
        index: number,
        fileInfo: IFileInfo
    ) {
        let options;
        if (typeof escaped === 'boolean') {
            options = { escaped };
        }
        super(str, options, index, fileInfo);
    }

    get expression() {
        return this.nodes;
    }

    eval(context) {
        const result = this.evaluateJavaScript(this.expression, context);
        const type = typeof result;

        if (type === 'number' && !isNaN(result)) {
            return new Dimension(result);
        } else if (type === 'string') {
            return new Quoted(`"${result}"`, result, this.options.escaped, this._index);
        } else if (Array.isArray(result)) {
            return new Anonymous(result.join(', '));
        } else {
            return new Anonymous(result);
        }
    }
}

JavaScript.prototype.type = 'JavaScript';
export default JavaScript;
