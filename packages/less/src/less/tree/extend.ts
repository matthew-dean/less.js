import Node, { IFileInfo, isNodeArgs, NodeArgs, NodeCollection } from './node';
import { Selector } from '.';

type V1Args = [
    selector: Node,
    option: string,
    index: number,
    fileInfo: IFileInfo
]

/**
 * @todo:
 * Refactor this and extend so that `Extend`
 * receives the preceding selector during parsing.
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
 * 
 * @todo - remove extendList from Selector
 */
class Extend extends Node {
    type: 'Extend'
    selector: Node

    /** @todo - I believe this can be simplified without the use of tracking ids */
    static next_id = 0
    object_id: number
    parent_ids: number[]

    /** @todo - Document what these mean */
    allowBefore: boolean
    allowAfter: boolean

    /** @todo - Document this usage in the extend visitor */
    selfSelectors: Node[]

    constructor(...args: NodeArgs | V1Args) {
        let [
            selector,
            options,
            index,
            fileInfo
        ] = args;
        if (!isNodeArgs(args)) {
            selector = { selector } as NodeCollection
        }

        options = typeof options === 'string'
            ? { extend: options }
            : options || {};

        super(selector, options, index, fileInfo);
        
        this.object_id = Extend.next_id++;
        this.parent_ids = [this.object_id];

        switch (options.extend) {
            case 'all':
                this.allowBefore = true;
                this.allowAfter = true;
                break;
            default:
                this.allowBefore = false;
                this.allowAfter = false;
                break;
        }
    }

    get option() {
        return this.options.extend;
    }

    // it concatenates (joins) all selectors in selector array
    findSelfSelectors(selectors) {
        let selfElements = [], i, selectorElements;

        for (i = 0; i < selectors.length; i++) {
            selectorElements = selectors[i].elements;
            // duplicate the logic in genCSS function inside the selector node.
            // future TODO - move both logics into the selector joiner visitor
            if (i > 0 && selectorElements.length && selectorElements[0].combinator.value === '') {
                selectorElements[0].combinator.value = ' ';
            }
            selfElements = selfElements.concat(selectors[i].elements);
        }

        this.selfSelectors = [new Selector(selfElements)];
        this.selfSelectors[0].copyVisibilityInfo(this.visibilityInfo());
    }
}

Extend.prototype.type = 'Extend';
Extend.prototype.allowRoot = true;
export default Extend;
