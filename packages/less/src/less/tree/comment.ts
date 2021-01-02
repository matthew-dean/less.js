import Node from './node';
import getDebugInfo from './debug-info';
import type { Context } from '../contexts';

class Comment extends Node {
    type: 'Comment'
    nodes: string

    constructor(value: string, isLineComment?: boolean, index?, currentFileInfo?) {
        super(
            value,
            {
                isLineComment
            },
            { startOffset: index || 0 },
            currentFileInfo
        );
        this.debugInfo = false;
    }

    genCSS(context: Context, output) {
        if (this.debugInfo) {
            output.add(getDebugInfo(context, this), this.fileInfo(), this.getIndex());
        }
        output.add(this.value);
    }

    isSilent(context: Context) {
        const isCompressed = context.options.compress && this.value[2] !== '!';
        return this.options.isLineComment || isCompressed;
    }
}

Comment.prototype.allowRoot = true;
Comment.prototype.type = 'Comment';

export default Comment;
