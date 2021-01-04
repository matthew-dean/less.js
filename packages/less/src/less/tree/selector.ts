import Node, { IFileInfo, NodeArgs, isNodeArgs, OutputCollector } from './node';
import { Element } from '.';
import LessError from '../less-error';
import type { Context } from '../contexts';

type V1Args = [
    elements: Element[],
    extendList?: Node[],
    condition?: Node,
    index?: number,
    fileInfo?: IFileInfo
];

/**
 * @todo - Refactor such that a selector only contains
 *         an Expression and a condition as node children
 */
class Selector extends Node {
    type: 'Selector'
    evaldCondition: boolean
    elements: Element[]
    extendList: Node[]
    condition: Node

    /** @todo - document */
    mediaEmpty: boolean

    /**
     * A value used for matching mixin calls.
     *
     * @todo - Can be improved a lot.         
     */
    mixinElements_: Element[] | string[]

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }
        let [
            elements,
            extendList,
            condition,
            index,
            fileInfo
        ] = args;

        super(
            {
                elements,
                extendList,
                condition
            },
            {},
            index,
            fileInfo
        );
        this.elements = this.getElements(elements);
        this.evaldCondition = !condition;
        this.mixinElements_ = undefined;
    }

    createDerived(elements, extendList, evaldCondition) {
        elements = this.getElements(elements);
        const newSelector = new Selector(elements, extendList || this.extendList).inherit(this);
        newSelector.evaldCondition = (evaldCondition != null) ? evaldCondition : this.evaldCondition;
        newSelector.mediaEmpty = this.mediaEmpty;
        return newSelector;
    }

    getElements(els: Element[] | string): Element[] {
        if (!els) {
            return [new Element('', '&', false, this._index, this._fileInfo)];
        }
        let result: Element[];
        if (typeof els === 'string') {
            this.parse.parseNode(
                els, 
                ['selector'],
                this._index, 
                this._fileInfo, 
                function(err, result) {
                    if (err) {
                        throw new LessError({
                            index: err.index,
                            message: err.message
                        }, this.parse.imports, this._fileInfo.filename);
                    }
                    result = result[0].elements;
                });
        } else {
            result = els;
        }
        return result;
    }

    static createEmptySelectors(index: number, fileInfo: IFileInfo) {
        const el = new Element('', '&', false, index, fileInfo);
        const sels = [new Selector([el], null, null, index, fileInfo)];
        sels[0].mediaEmpty = true;
        return sels;
    }

    match(other) {
        const elements = this.elements;
        const len = elements.length;
        let olen;
        let i;

        other = other.mixinElements();
        olen = other.length;
        if (olen === 0 || len < olen) {
            return 0;
        } else {
            for (i = 0; i < olen; i++) {
                if (elements[i].value !== other[i]) {
                    return 0;
                }
            }
        }

        return olen; // return number of matched elements
    }

    mixinElements() {
        if (this.mixinElements_) {
            return this.mixinElements_;
        }

        let elements = this.elements.map( function(v) {
            return v.combinator.value + (v.value instanceof Node ? v.value.value : v.value);
        }).join('').match(/[,&#\*\.\w-]([\w-]|(\\.))*/g);

        if (elements) {
            if (elements[0] === '&') {
                elements.shift();
            }
        } else {
            elements = [];
        }

        return (this.mixinElements_ = [...elements]);
    }

    isJustParentSelector() {
        return !this.mediaEmpty &&
            this.elements.length === 1 &&
            this.elements[0].value === '&' &&
            (this.elements[0].combinator.value === ' ' || this.elements[0].combinator.value === '');
    }

    eval(context: Context) {
        const evaldCondition = this.condition && this.condition.eval(context);
        let elements = this.elements;
        let extendList = this.extendList;

        elements = elements && elements.map(function (e) { return e.eval(context); });
        extendList = extendList && extendList.map(function(extend) { return extend.eval(context); });

        return this.createDerived(elements, extendList, evaldCondition);
    }

    genCSS(context: Context, output: OutputCollector) {
        let i, element;
        if ((!context || !context.firstSelector) && this.elements[0].combinator.value === '') {
            output.add(' ', this.fileInfo(), this.getIndex());
        }
        for (i = 0; i < this.elements.length; i++) {
            element = this.elements[i];
            element.genCSS(context, output);
        }
    }

    getIsOutput() {
        return this.evaldCondition;
    }
}

Selector.prototype.type = 'Selector';

export default Selector;
