import Node, { IFileInfo, NodeArgs, isNodeArgs } from './node';
import Element from './element';
import LessError from '../less-error';
import type Visitor from '../visitors/visitor';

type V1Args = [
    elements: Node[],
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

    /** @todo - document */
    mediaEmpty: boolean

    /**
     * A value used for matching mixin calls.
     *
     * @todo - Can be improved a lot.         
     */
    mixinElements_: Node[]

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
            [
                elements,
                extendList,
                condition
            ],
            {},
            index,
            fileInfo
        );
        this.nodes[0] = this.getElements(elements);
        this.evaldCondition = !condition;
        this.mixinElements_ = undefined;
    }

    get elements() {
        return this.nodes[0];
    }
    /**
     * @todo:
     * Refactor this and extend so that `Extend`
     * receives this selector during parsing.
     *   i.e.
     *   This code: `.a:extend(.b)`
     *     should result in:
     *       <Extend { nodes: [.a, .b] }>
     *   Instead of:
     *       <Selector { nodes: [.a, [<Extend .b>]}>
     * 
     * Doing it the first way would make it much easier to
     * evaluate and is actually more logical to the expression,
     * which is that :extend is receiving the selector prior
     * to it.
     */
    get extendList() {
        return this.nodes[1];
    }
    get condition() {
        return this.nodes[2];
    }

    /**
     * @todo - This can be improved when this.nodes is more flat.
     */
    accept(visitor: Visitor) {
        if (this.elements) {
            this.nodes[0] = visitor.visitArray(this.elements);
        }
        if (this.extendList) {
            this.nodes[1] = visitor.visitArray(this.extendList);
        }
        if (this.condition) {
            this.nodes[2] = visitor.visit(this.condition);
        }
    }

    createDerived(elements, extendList, evaldCondition) {
        elements = this.getElements(elements);
        const newSelector = new Selector([elements, extendList || this.extendList]).inherit(this);
        newSelector.evaldCondition = (evaldCondition != null) ? evaldCondition : this.evaldCondition;
        newSelector.mediaEmpty = this.mediaEmpty;
        return newSelector;
    }

    getElements(els: Node[] | string) {
        if (!els) {
            return [new Element('', '&', false, this._index, this._fileInfo)];
        }
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
                    els = result[0].elements;
                });
        }
        return els;
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
            return v.combinator.value + (v.value.value || v.value);
        }).join('').match(/[,&#\*\.\w-]([\w-]|(\\.))*/g);

        if (elements) {
            if (elements[0] === '&') {
                elements.shift();
            }
        } else {
            elements = [];
        }

        return (this.mixinElements_ = elements);
    }

    isJustParentSelector() {
        return !this.mediaEmpty &&
            this.elements.length === 1 &&
            this.elements[0].value === '&' &&
            (this.elements[0].combinator.value === ' ' || this.elements[0].combinator.value === '');
    }

    eval(context) {
        const evaldCondition = this.condition && this.condition.eval(context);
        let elements = this.elements;
        let extendList = this.extendList;

        elements = elements && elements.map(function (e) { return e.eval(context); });
        extendList = extendList && extendList.map(function(extend) { return extend.eval(context); });

        return this.createDerived(elements, extendList, evaldCondition);
    }

    genCSS(context, output) {
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
