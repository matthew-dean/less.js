import Node, { NodeArgs } from './node';

type V1Args = [
    value: string,
    index?: number,
    currentFileInfo?: any,
    mapLines?: boolean,
    rulesetLike?: boolean
]

class Anonymous extends Node {
    type: 'Anonymous'
    value: string

    constructor(...args: V1Args | NodeArgs) {
        if (args[1] && typeof args[1] !== 'number') {
            super(...(<NodeArgs>args))
            return
        }
        const [
            value,
            index,
            currentFileInfo,
            mapLines,
            rulesetLike
        ] = <V1Args>args

        super(
            value,
            {
                rulesetLike: !!rulesetLike,
                mapLines
            },
            index,
            currentFileInfo
        )
    }

    eval() {
        return this;
    }

    compare(other) {
        return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
    }

    isRulesetLike() {
        return this.options.rulesetLike;
    }

    genCSS(context, output) {
        this.nodeVisible = Boolean(this.value);
        if (this.nodeVisible) {
            output.add(this.value, this._fileInfo, this._index, this.options.mapLines);
        }
    }
}

Anonymous.prototype.allowRoot = true;
Anonymous.prototype.type = 'Anonymous';

export default Anonymous;
