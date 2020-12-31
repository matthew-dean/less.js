import Node, { IFileInfo, NodeArgs, OutputCollector } from './node';
import Paren from './paren';
import Combinator from './combinator';
import type { Context } from '../contexts';

type V1Args = [
    combinator: string | Combinator,
    value: Node | string,
    isVariable?: boolean,
    index?: number,
    fileInfo?: IFileInfo
];

export const isNodeArgs = (args: V1Args | NodeArgs): args is NodeArgs => {
    return Array.isArray(args[0])
}

/**
 * @todo - eliminate in favor of expressions 
 */
class Element extends Node {
    type: 'Element'
    nodes: [Combinator, string | Node]

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }
        let [
            combinator,
            value,
            isVariable,
            index,
            fileInfo
        ] = args;

        combinator = combinator instanceof Combinator ?
            combinator : new Combinator(combinator);

        if (typeof value === 'string') {
            value = value.trim();
        } else if (value) {
            value = value;
        } else {
            value = '';
        }
        super([combinator, value], { isVariable }, index, fileInfo);
    }

    get combinator() {
        return this.nodes[0]
    }

    get value() {
        return this.nodes[1]
    }

    genCSS(context: Context, output: OutputCollector) {
        output.add(this.toCSS(context), this.fileInfo(), this.getIndex());
    }

    toCSS(context?: Context) {
        const thisContext: Context | Record<any, any> = context || {};
        let value = this.value;
        const firstSelector = thisContext.firstSelector;
        if (value instanceof Paren) {
            // selector in parens should not be affected by outer selector
            // flags (breaks only interpolated selectors - see #1973)
            thisContext.firstSelector = true;
        }
        value = value instanceof Node ? value.toCSS(context) : value;
        thisContext.firstSelector = firstSelector;
        if (value === '' && this.combinator.value.charAt(0) === '&') {
            return '';
        } else {
            return this.combinator.toCSS(context) + value;
        }
    }
}

Element.prototype.type = 'Element';

export default Element;
