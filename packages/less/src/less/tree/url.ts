import Node, { IFileInfo, NodeArgs } from './node';
import { Quoted } from '.';
import type { Context } from '../contexts';

function escapePath(path) {
    return path.replace(/[\(\)'"\s]/g, function(match) { return `\\${match}`; });
}

type V1Args = [
    value: Node,
    index: number,
    fileInfo: IFileInfo,
    isEvald?: boolean
]

export const isV1Args = (args: V1Args | NodeArgs): args is V1Args => {
    return typeof args[1] === 'number';
};

class URL extends Node {
    type: 'Url'
    nodes: Node

    constructor(...args: NodeArgs | V1Args) {
        if (isV1Args(args)) {
            const [
                value,
                index,
                fileInfo
            ] = args;
            super(value, {}, index, fileInfo);
            return;
        }
        super(...args);
    }

    genCSS(context: Context, output) {
        output.add('url(');
        this.value.genCSS(context, output);
        output.add(')');
    }

    eval(context: Context) {
        const val = this.nodes.eval(context);
        let rootpath: string;

        if (!this.evaluated) {
            this.evaluated = true;
            // Add the rootpath if the URL requires a rewrite
            rootpath = this.fileInfo() && this.fileInfo().rootpath;
            if (typeof rootpath === 'string' &&
                typeof val.value === 'string' &&
                context.pathRequiresRewrite(val.value)) {
                if (!(val instanceof Quoted)) {
                    rootpath = escapePath(rootpath);
                }
                val.value = context.rewritePath(val.value, rootpath);
            } else {
                val.value = context.normalizePath(val.value);
            }

            // Add url args if enabled
            if (context.options.urlArgs) {
                if (!val.value.match(/^\s*data:/)) {
                    const delimiter = val.value.indexOf('?') === -1 ? '?' : '&';
                    const urlArgs = delimiter + context.options.urlArgs;
                    if (val.value.indexOf('#') !== -1) {
                        val.value = val.value.replace('#', `${urlArgs}#`);
                    } else {
                        val.value += urlArgs;
                    }
                }
            }
        }

        return new URL(val, this.getIndex(), this.fileInfo(), true);
    }
}

URL.prototype.type = 'Url';

export default URL;
