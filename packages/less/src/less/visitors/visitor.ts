import type Node from '../tree/node';

const _visitArgs = { visitDeeper: true };

function _noop(node) {
    return node;
}

/**
 * @todo
 * Make this a proper abstract class with typed abstract
 * methods for each rule type
 */
class Visitor {
    /** @todo - refine types */
    _implementation: any;
    _visitInCache: any;
    _visitOutCache: any;

    constructor(implementation) {
        this._implementation = implementation;
        this._visitInCache = {};
        this._visitOutCache = {};
    }

    visit(node: Node) {
        if (!node) {
            return node;
        }

        const nodeTypeIndex = node.type;
        if (!nodeTypeIndex) {
            /**
             * MixinCall args aren't a node type?
             * @todo - Fix this
             */
            if (node.value && node.value.typeIndex) {
                this.visit(node.value);
            }
            return node;
        }

        const impl = this._implementation;
        let func = this._visitInCache[nodeTypeIndex];
        let funcOut = this._visitOutCache[nodeTypeIndex];
        const visitArgs = _visitArgs;
        let fnName;

        visitArgs.visitDeeper = true;

        if (!func) {
            fnName = `visit${node.type}`;
            func = impl[fnName] || _noop;
            funcOut = impl[`${fnName}Out`] || _noop;
            this._visitInCache[nodeTypeIndex] = func;
            this._visitOutCache[nodeTypeIndex] = funcOut;
        }

        if (func !== _noop) {
            const newNode = func.call(impl, node, visitArgs);
            if (node && impl.isReplacing) {
                node = newNode;
            }
        }

        if (visitArgs.visitDeeper && node) {
            /**
             * @note This is hard to reason about.
             *       Ideally (?), a Node that is visited should return a Node.
             *       An array that is visited (this.visitArray) should
             *       return an array.
             * 
             * @todo Investigate if this ever happens and fix if possible.
             */
            if (Array.isArray(node)) {
                for (let i = 0, cnt = node.length; i < cnt; i++) {
                    if (node[i].accept) {
                        node[i].accept(this);
                    }
                }
            } else if (node.accept) {
                node.accept(this);
            }
        }

        if (funcOut != _noop) {
            funcOut.call(impl, node);
        }

        return node;
    }

    visitArray(nodes: Node[], nonReplacing?: boolean) {
        if (!nodes) {
            return nodes;
        }

        const cnt = nodes.length;
        let i;

        // Non-replacing
        if (nonReplacing || !this._implementation.isReplacing) {
            for (i = 0; i < cnt; i++) {
                this.visit(nodes[i]);
            }
            return nodes;
        }

        // Replacing
        const out = [];
        for (i = 0; i < cnt; i++) {
            const evald = this.visit(nodes[i]);

            /** 
             * @note This will remove nodes when the visitor
             *       returns nothing, changing the shape of the
             *       return array.
             */
            if (evald === undefined) { continue; }
            
            if (!(Array.isArray(evald))) {
                out.push(evald);
            } else if (evald.length) {
                this.flatten(evald, out);
            }
        }
        return out;
    }

    flatten(arr: any[], out: any[]) {
        if (!out) {
            out = [];
        }

        let cnt = arr.length;

        for (let i = 0; i < cnt; i++) {
            let item = arr[i];
            if (item === undefined) {
                continue;
            }
            if (!item.splice) {
                out.push(item);
                continue;
            }

            for (let j = 0, nestedCnt = item.length; j < nestedCnt; j++) {
                let nestedItem = item[j];
                if (nestedItem === undefined) {
                    continue;
                }
                if (!nestedItem.splice) {
                    out.push(nestedItem);
                } else if (nestedItem.length) {
                    this.flatten(nestedItem, out);
                }
            }
        }

        return out;
    }
}

export default Visitor;
