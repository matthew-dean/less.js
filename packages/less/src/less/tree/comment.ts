import Node, { IFileInfo, isNodeArgs, NodeArgs } from './node';
import getDebugInfo from './debug-info';
import type { Context } from '../contexts';

type V1Args = [
    value: string,
    isLineComment?: boolean,
    index?: number,
    fileInfo?: IFileInfo
];
class Comment extends Node {
    type: 'Comment'

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }
        const [
            value,
            isLineComment,
            index,
            fileInfo
        ] = args;
        super(
            { value },
            {
                isLineComment
            },
            { startOffset: index || 0 },
            fileInfo
        );
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
Comment.prototype.debugInfo = false;
Comment.prototype.type = 'Comment';

export default Comment;
