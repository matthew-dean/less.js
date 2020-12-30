import type { IFileInfo } from '../types'
import type { Context } from '../contexts'

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
    options: INodeOptions,
    location?: ILocationInfo | number,
    fileInfo?: IFileInfo
]

export const isNodeArgs = (args: any[] | NodeArgs): args is NodeArgs => {
    const optArg = args[1]
    return !!optArg && typeof optArg === 'object' && optArg.constructor === Object
}

export { IFileInfo }
class Node {
    /**
     * This can contain a primitive value or a Node,
     * or a mixed array of either/or. This should be
     * "the data that creates the CSS string".
     * 
     * The default visitor visits any Node nodes
     * within `nodes`, and the default `eval` func
     * does the same, recursively evaluating Node
     * values within `nodes`
     */
    nodes: NodeValue

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
    type: string

    constructor(
        nodes: NodeValue,
        options?: INodeOptions,
        location?: ILocationInfo | number,
        fileInfo?: IFileInfo
    ) {
        this.nodes = nodes;
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

        this.processNodes(n => this.setParent(n))
    }

    /** 
     * Usually, this is the same value as `nodes`,
     * but individual Nodes can override to point
     * to a subset of `nodes`. This is done for
     * legacy API reasons.
     */
    get value() {
        return this.nodes
    }

    /**
     * Processes all Node values in `value`
     */
    processNodes(func: (n: Node) => Node) {
        const node = this.nodes
        if (Array.isArray(node)) {
            return node.forEach((n, i) => {
                if (n instanceof Node) {
                    this.nodes[i] = func(n)
                }
            })
        }
        if (node instanceof Node) {
            this.nodes = func(node)
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

    toCSS(context?: Context) {
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

    addToOutput(val: Primitive, context: Context, output) {
        if (val instanceof Node) {
            output.add(val.genCSS(context, output))
        } else if (val) {
            /** Serialize a primitive value into a string */
            output.add(`${val}`)
        }
    }

    /** Will be over-ridden by most nodes */
    genCSS(context: Context, output) {
        const value = this.nodes;
        if (Array.isArray(value)) {
            value.forEach(val => {
                this.addToOutput(val, context, output)
            });
        } else {
            this.addToOutput(value, context, output);
        }
    }

    accept(visitor) {
        this.processNodes(n => visitor.visit(n));
    }

    eval(context?: any): Node {
        if (!this.evaluated) {
            this.processNodes(n => n.eval(context))
            this.evaluated = true;
        }
        return this;
    }

    inherit(node: Node) {
        this.parent = node.parent
        this._location = node._location
        this._fileInfo = node._fileInfo
        this.rootNode = node.rootNode
        this.evaluated = node.evaluated
        return this
    }

    /**
     * Creates a copy of the current node.
     *
     * @param shallow - doesn't deeply clone nodes (retains references)
     */
    clone(shallow: boolean = false): this {
        const Clazz = Object.getPrototypeOf(this).constructor
        const newNode = new Clazz(
            this.nodes,
            {...this.options},
            /** For now, there's no reason to mutate location,
             * so its reference is just copied */
            this._location,
            this._fileInfo
        )

        /**
         * First copy over Node-derived-specific props. We eliminate any props specific
         * to the base Node class.
         */
        for (let prop in this) {
            if (this.hasOwnProperty(prop)) {
                newNode[prop] = this[prop]
            }
        }

        /** Copy inheritance props */
        newNode.inherit(this)

        if (!shallow) {
            /**
             * Perform a deep clone
             * This will overwrite the parent / root props of children nodes.
             */
            newNode.processNodes((node: Node) => node.clone())
        }
        return newNode
    }

    _operate(context, op: string, a: number, b: number) {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return a / b;
        }
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

    static numericCompare(a: number, b: number) {
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
