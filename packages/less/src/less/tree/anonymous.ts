import Node from './node';

const Anonymous = function(
    value,
    index?,
    currentFileInfo?,
    mapLines?,
    rulesetLike?,
    visibilityInfo?
) {
    Node.call(
        this,
        value,
        { startOffset: index },
        currentFileInfo,
        {
            rulesetLike: !!rulesetLike,
            allowRoot: true,
            mapLines
        }
    )
}

Anonymous.prototype = Object.assign(Object.create(Node.prototype), {
    type: 'Anonymous',
    eval() {
        return new Anonymous(this.value, this._index, this._fileInfo, this.mapLines, this.rulesetLike, this.visibilityInfo());
    },
    compare(other) {
        return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
    },
    isRulesetLike() {
        return this.rulesetLike;
    },
    genCSS(context, output) {
        this.nodeVisible = Boolean(this.value);
        if (this.nodeVisible) {
            output.add(this.value, this._fileInfo, this._index, this.mapLines);
        }
    }
})

export default Anonymous;
