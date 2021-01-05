import Node, { IFileInfo, NodeArgs, isNodeArgs, OutputCollector } from './node';
import { Paren, Combinator } from '.';
import type { Context } from '../contexts';

type V1Args = [
    combinator: Combinator | string,
    value: Node | string,
    isVariable?: boolean,
    index?: number,
    fileInfo?: IFileInfo
];

/**
 * @todo - eliminate in favor of expressions 
 */
class Element extends Node {
    type: 'Element'
    combinator: Combinator
    value: Node | string

    constructor(...args: NodeArgs | V1Args) {
        /** @todo - reduce code duplication */
        if (isNodeArgs(args)) {
            super(...args);
            let combinator = this.combinator;
            let value = this.value;
            this.combinator = combinator instanceof Combinator ?
                combinator : new Combinator(combinator);
            if (typeof value === 'string') {
                value = value.trim();
            } else if (!value) {
                value = '';
            }
            this.value = value;
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
        } else if (!value) {
            value = '';
        }

        super({ combinator, value }, { isVariable }, index, fileInfo);
    }

    genCSS(context: Context, output: OutputCollector) {
        output.add(this.toCSS(context), this.fileInfo, this.getIndex());
    }

    eval(context: Context): Element {
        return this;
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
