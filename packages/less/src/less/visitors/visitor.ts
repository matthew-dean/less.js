import type Node from '../tree/node';

const _visitArgs = { visitDeeper: true };

function _noop(node) {
    return node;
}

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

    visit(n: Node): Node {
        if (!n || !n.type) {
            return n;
        }

        const nodeTypeIndex = n.type;
        const impl = this._implementation;
        let func = this._visitInCache[nodeTypeIndex];
        let funcOut = this._visitOutCache[nodeTypeIndex];
        const visitArgs = _visitArgs;
        let fnName;

        visitArgs.visitDeeper = true;

        if (!func) {
            fnName = `visit${n.type}`;
            func = impl[fnName] || _noop;
            funcOut = impl[`${fnName}Out`] || _noop;
            this._visitInCache[nodeTypeIndex] = func;
            this._visitOutCache[nodeTypeIndex] = funcOut;
        }

        /**
         * @todo - Remove this type aliasing when we address the note below.
         */
        let node: Node | Node[] = n;

        if (func !== _noop) {
            const newNode = func.call(impl, n, visitArgs);
            if (n && impl.isReplacing) {
                node = newNode;
            }
        }

        if (visitArgs.visitDeeper && node) {
            /**
             * @note This is hard to reason about and we shouldn't allow this to happen.
             *       A Node that is visited should return a Node.
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
                n = node[0];
            } else if (node.accept) {
                node.accept(this);
                n = node;
            }
        }

        /**
         * @note Because of the above code's weirdness (see note),
         *       then we make sure we are calling back only one Node.
         */
        if (funcOut != _noop) {
            funcOut.call(impl, n);
        }

        return n;
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
