import { Ruleset, List, Selector, Anonymous, Expression, AtRule } from '.';
import * as utils from '../utils';
import { IFileInfo, NodeArgs } from './node';
import type { Context } from '../contexts';
import type Node from './node';

type V1Args = [
    rules: Node[],
    features: Node[],
    index?: number,
    fileInfo?: IFileInfo
];

export const isV1Args = (args: V1Args | NodeArgs): args is V1Args => {
    return Array.isArray(args[1]);
};

/**
 * @todo - Can this be refactored to re-use code from `AtRule`?
 */
class Media extends AtRule {
    type: 'Media';

    constructor(...args: NodeArgs | V1Args) {
        if (!(isV1Args(args))) {
            const [
                nodes,
                options,
                location,
                fileInfo
            ] = args;
            if (nodes.length === 2) {
                nodes.unshift('@media');
            }
            super(nodes, options, location, fileInfo);
            return;
        }

        let [
            rules,
            features,
            index,
            fileInfo
        ] = args;

        const selectors = Selector.createEmptySelectors(index, fileInfo);
        const featureList = new List(features);
        const ruleset = new Ruleset([selectors, rules], {});
        ruleset.allowImports = true;

        super(['@media', featureList, ruleset], {}, index, fileInfo);
    }

    get features() {
        return this.nodes[1];
    }
    set features(n: Node) {
        this.nodes[1] = n;
    }

    isRulesetLike() { return true; }

    eval(context: Context) {
        if (!context.mediaBlocks) {
            context.mediaBlocks = [];
            context.mediaPath = [];
        }

        const media = new Media(
            [
                this.features.eval(context),
                new Ruleset(
                    Selector.createEmptySelectors(this.getIndex(), this.fileInfo()),
                    []
                )
            ],
            {}, this._location, this._fileInfo
        );
        if (this.debugInfo) {
            this.rules.debugInfo = this.debugInfo;
            media.debugInfo = this.debugInfo;
        }

        context.mediaPath.push(media);
        context.mediaBlocks.push(media);

        this.rules.functionRegistry = context.frames[0].functionRegistry.inherit();
        context.frames.unshift(this.rules);
        media.rules = this.rules.eval(context);
        context.frames.shift();
        context.mediaPath.pop();

        return context.mediaPath.length === 0 ? media.evalTop(context) :
            media.evalNested(context);
    }

    evalTop(context: Context) {
        let result = this;

        // Render all dependent Media blocks.
        if (context.mediaBlocks.length > 1) {
            const selectors = Selector.createEmptySelectors(this.getIndex(), this.fileInfo());
            const rules = new Ruleset(selectors, context.mediaBlocks);
            rules.multiMedia = true;
            rules.copyVisibilityInfo(this.visibilityInfo());
        }

        context.mediaBlocks = undefined;
        context.mediaPath = undefined;

        return result;
    }

    evalNested(context: Context) {
        let i;
        let value;
        const path = context.mediaPath.concat([this]);

        // Extract the media-query conditions separated with `,` (OR).
        for (i = 0; i < path.length; i++) {
            value = path[i].features instanceof List ?
                path[i].features.value : path[i].features;
            path[i] = Array.isArray(value) ? value : [value];
        }

        // Trace all permutations to generate the resulting media-query.
        //
        // (a, b and c) with nested (d, e) ->
        //    a and d
        //    a and e
        //    b and c and d
        //    b and c and e
        this.features = new List(this.permute(path).map(path => {
            path = path.map(fragment => fragment.toCSS ? fragment : new Anonymous(fragment));

            for (i = path.length - 1; i > 0; i--) {
                path.splice(i, 0, new Anonymous('and'));
            }

            return new Expression(path);
        }));

        // Fake a tree-node that doesn't output anything.
        return new Ruleset([], []);
    }

    permute(arr) {
        if (arr.length === 0) {
            return [];
        } else if (arr.length === 1) {
            return arr[0];
        } else {
            const result = [];
            const rest = this.permute(arr.slice(1));
            for (let i = 0; i < rest.length; i++) {
                for (let j = 0; j < arr[0].length; j++) {
                    result.push([arr[0][j]].concat(rest[i]));
                }
            }
            return result;
        }
    }

    bubbleSelectors(selectors) {
        if (!selectors) {
            return;
        }
        this.rules = new Ruleset(utils.copyArray(selectors), [this.rules[0]]);
    }
}

Media.prototype.type = 'Media';
Media.prototype.allowRoot = true;

export default Media;
