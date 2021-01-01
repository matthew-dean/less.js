import Node, { NodeArgs, NodeValue, OutputCollector } from './node';
import type { Context } from '../contexts';

type V1Args = [
    value: string,
    index?: number,
    currentFileInfo?: any,
    mapLines?: boolean,
    isRulesetLike?: boolean
]

class Anonymous extends Node {
    type: 'Anonymous'
    nodes: string

    constructor(...args: V1Args | NodeArgs) {
        if (args[1] && typeof args[1] !== 'number') {
            super(...(<NodeArgs>args));
            return;
        }
        const [
            value,
            index,
            currentFileInfo,
            mapLines,
            isRulesetLike
        ] = <V1Args>args;

        super(
            value,
            {
                isRulesetLike,
                mapLines
            },
            index,
            currentFileInfo
        );
    }

    eval() {
        return this;
    }

    /** Will this ever not be a Node? */
    compare(other: NodeValue) {
        return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
    }

    genCSS(context: Context, output: OutputCollector) {
        this.nodeVisible = Boolean(this.value);
        if (this.nodeVisible) {
            output.add(this.value, this._fileInfo, this._index, this.options.mapLines);
        }
    }
}

Anonymous.prototype.allowRoot = true;
Anonymous.prototype.type = 'Anonymous';

export default Anonymous;
