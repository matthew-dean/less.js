import Node from './node';
import getDebugInfo from './debug-info';

class Comment extends Node {
    type: 'Comment'
    nodes: string

    constructor(value: string, isLineComment: boolean, index, currentFileInfo) {
        super(
            value,
            {
                isLineComment
            },
            { startOffset: index },
            currentFileInfo
        );
        this.debugInfo = false;
    }

    genCSS(context, output) {
        if (this.debugInfo) {
            output.add(getDebugInfo(context, this), this.fileInfo(), this.getIndex());
        }
        output.add(this.value);
    }

    isSilent(context) {
        const isCompressed = context.compress && this.value[2] !== '!';
        return this.options.isLineComment || isCompressed;
    }
}

Comment.prototype.allowRoot = true;
Comment.prototype.type = 'Comment';

export default Comment;
