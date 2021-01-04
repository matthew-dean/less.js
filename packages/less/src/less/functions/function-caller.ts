import type { Context } from '../contexts';
import Expression from '../tree/expression';
import type { IFileInfo } from '../tree/node';

/**
 * Used as a `this` scope for function calls.
 * 
 * @todo
 * Should this be passed the current environment, to clean up
 * the data-uri function? Alternatively, should context have a
 * reference to the environment?
 */
class FunctionCaller {
    name: string;
    index: number;
    context: Context;
    currentFileInfo: IFileInfo;
    func: Function & {
        evalArgs: boolean
    }

    constructor(name: string, context: Context, index: number, currentFileInfo: IFileInfo) {
        this.name = name.toLowerCase();
        this.index = index;
        this.context = context;
        this.currentFileInfo = currentFileInfo;

        this.func = context.frames[0].functionRegistry.get(this.name);
    }

    isValid() {
        return Boolean(this.func);
    }

    call(args) {
        if (!(Array.isArray(args))) {
            args = [args];
        }
        const evalArgs = this.func.evalArgs;
        if (evalArgs !== false) {
            args = args.map(a => a.eval(this.context));
        }
        const commentFilter = item => !(item.type === 'Comment');

        /**
         * @todo
         * This code is terrible and should be replaced as per this issue:
         * @see: https://github.com/less/less.js/issues/2477
         */
        args = args
            .filter(commentFilter)
            .map(item => {
                if (item.type === 'Expression') {
                    const subNodes = item.value.filter(commentFilter);
                    if (subNodes.length === 1) {
                        return subNodes[0];
                    } else {
                        return new Expression(subNodes);
                    }
                }
                return item;
            });

        /** 
         * @todo
         * Re-do this, as functions should all have a properly-scoped
         * `this` object bound to them (where? intrinsically?) with a
         * `context` property already present. See `data-uri` which
         * references `this.context`
         */
        if (evalArgs === false) {
            return this.func(this.context, ...args);
        }

        return this.func(...args);
    }
}

export default FunctionCaller;
