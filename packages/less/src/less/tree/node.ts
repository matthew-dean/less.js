import type { IFileInfo } from '../types'

type Primitive = Node | any
export type NodeValue = Primitive | Primitive[]

export type ILocationInfo = {
    startOffset: number
    startLine?: number
    startColumn?: number
    endOffset?: number
    endLine?: number
    endColumn?: number
}
export type INodeOptions = {
    rulesetLike?: boolean
    /** Allow arbitrary options */
    [k: string]: boolean | string | number
}

export type NodeArgs = [
    value: NodeValue,
    options?: INodeOptions,
    location?: ILocationInfo | number,
    fileInfo?: IFileInfo
]

export { IFileInfo }

class Node {
    /**
     * This can contain a primitive value or a Node,
     * or a mixed array of either/or. This should be
     * "the data that creates the CSS string".
     * 
     * The default visitor visits any Node nodes
     * within `value`, and the default `eval` func
     * does the same, recursively evaluating Node
     * values within `value`
     */
    value: NodeValue

    parent: Node
    nodeVisible: boolean
    rootNode: Node
    allowRoot: boolean
    evalFirst: boolean

    /** Specific node options */
    options: INodeOptions

    _location: ILocationInfo
    _fileInfo: IFileInfo

    /** Increments as we enter / exit rules that block visibility? */
    visibilityBlocks: number
    evaluated: boolean

    constructor(
        value: NodeValue,
        options?: INodeOptions,
        location?: ILocationInfo | number,
        fileInfo?: IFileInfo
    ) {
        this.value = value;
        if (typeof location === 'number') {
            this._location = { startOffset: location }
        } else {
            this._location = location
        }
        this._fileInfo = fileInfo;
        this.options = options || {};

        this.visibilityBlocks = 0;
        this.nodeVisible = undefined;
        this.rootNode = this;
        this.evaluated = false;

        this.processValue(n => this.setParent(n))
    }

    /**
     * Processes all Node values in `value`
     */
    processValue(func: (n: Node) => Node) {
        const node = this.value
        if (Array.isArray(node)) {
            return node.forEach((n, i) => {
                if (n instanceof Node) {
                    this.value[i] = func(n)
                }
            })
        }
        if (node instanceof Node) {
            this.value = func(node)
        }
    }

    setParent(node: Node) {
        node.parent = this
        node.rootNode = this.rootNode
        
        if (!node._fileInfo) {
            node._fileInfo = this._fileInfo
        }
        if (!node._location) {
            node._location = this._location
        }
        return node
    }

    get _index(): number {
        return this._location.startOffset
    }

    getIndex() {
        return this._index;
    }

    fileInfo() {
        return this._fileInfo;
    }

    isRulesetLike() { return false; }

    toCSS(context?: any) {
        const strs = [];
        this.genCSS(context, {
            add: function(chunk, fileInfo, index) {
                strs.push(chunk);
            },
            isEmpty: function () {
                return strs.length === 0;
            }
        });
        return strs.join('');
    }

    addToOutput(val: Primitive, context, output) {
        if (val instanceof Node) {
            output.add(val.genCSS(context, output))
        } else if (val) {
            output.add(val)
        }
    }

    genCSS(context, output) {
        const value = this.value;
        if (Array.isArray(value)) {
            value.forEach(val => {
                this.addToOutput(val, context, output)
            });
        } else {
            this.addToOutput(value, context, output);
        }
    }

    accept(visitor) {
        this.processValue(n => visitor.visit(n));
    }

    eval(context?: any): Node {
        if (!this.evaluated) {
            this.processValue(n => n.eval(context))
            this.evaluated = true;
        }
        return this;
    }

    _operate(context, op, a, b) {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return a / b;
        }
    }

    fround(context, value) {
        const precision = context && context.numPrecision;
        // add "epsilon" to ensure numbers like 1.000000005 (represented as 1.000000004999...) are properly rounded:
        return (precision) ? Number((value + 2e-16).toFixed(precision)) : value;
    }

    static compare(a, b) {
        /* returns:
         -1: a < b
         0: a = b
         1: a > b
         and *any* other value for a != b (e.g. undefined, NaN, -2 etc.) */

        if ((a.compare) &&
            // for "symmetric results" force toCSS-based comparison
            // of Quoted or Anonymous if either value is one of those
            !(b.type === 'Quoted' || b.type === 'Anonymous')) {
            return a.compare(b);
        } else if (b.compare) {
            return -b.compare(a);
        } else if (a.type !== b.type) {
            return undefined;
        }

        a = a.value;
        b = b.value;
        if (!Array.isArray(a)) {
            return a === b ? 0 : undefined;
        }
        if (a.length !== b.length) {
            return undefined;
        }
        for (let i = 0; i < a.length; i++) {
            if (Node.compare(a[i], b[i]) !== 0) {
                return undefined;
            }
        }
        return 0;
    }

    static numericCompare(a, b) {
        return a  <  b ? -1
            : a === b ?  0
                : a  >  b ?  1 : undefined;
    }

    // Returns true if this node represents root of ast imported by reference
    blocksVisibility() {
        return this.visibilityBlocks !== 0;
    }

    addVisibilityBlock() {
        this.visibilityBlocks += 1;
    }

    removeVisibilityBlock() {
        this.visibilityBlocks -= 1;
    }

    // Turns on node visibility - if called node will be shown in output regardless
    // of whether it comes from import by reference or not
    ensureVisibility() {
        this.nodeVisible = true;
    }

    // Turns off node visibility - if called node will NOT be shown in output regardless
    // of whether it comes from import by reference or not
    ensureInvisibility() {
        this.nodeVisible = false;
    }

    // return values:
    // false - the node must not be visible
    // true - the node must be visible
    // undefined or null - the node has the same visibility as its parent
    isVisible(): boolean | undefined {
        return this.nodeVisible;
    }

    visibilityInfo() {
        return {
            visibilityBlocks: this.visibilityBlocks,
            nodeVisible: this.nodeVisible
        };
    }

    copyVisibilityInfo(info) {
        if (!info) {
            return;
        }
        this.visibilityBlocks = info.visibilityBlocks;
        this.nodeVisible = info.nodeVisible;
    }
}

export default Node;
