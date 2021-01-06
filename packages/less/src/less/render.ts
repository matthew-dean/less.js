import * as utils from './utils';
import type { Context } from './contexts';

/** @todo - refine types */
export default function(environment, ParseTree, ImportManager) {
    const render = function (input, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = utils.copyOptions(this.options, {});
        }
        else {
            options = utils.copyOptions(this.options, options || {});
        }

        if (!callback) {
            const self = this;
            return new Promise(function (resolve, reject) {
                render.call(self, input, options, function(err, output) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(output);
                    }
                });
            });
        } else {
            this.parse(input, options, function(err, root, imports, context: Context) {
                if (err) { return callback(err); }

                let result;
                try {
                    const parseTree = new ParseTree(root, imports);
                    result = parseTree.toCSS(context);
                }
                catch (err) { return callback(err); }

                callback(null, result);
            });
        }
    };

    return render;
};
