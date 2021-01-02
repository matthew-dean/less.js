import { NodeArgs, isNodeArgs, IFileInfo, OutputCollector } from './node';
import { Node, Selector, Ruleset, Anonymous } from '.';
import type { Context } from '../contexts';

type V1Args = [
    name: string,
    prelude: Node | string,
    rules: Ruleset,
    index: number,
    fileInfo: IFileInfo,
    debugInfo: boolean,
    isRooted: boolean
];

/**
 * @note
 * The reason why AtRules (and the `Media` node) have a Ruleset child
 * (with a '&' selector) is because of at-rule bubbling (I think). If we have
 * this...
 *   .rule {
 *     @at-rule {
 *       prop: value;
 *     }
 *   }
 * ...then what we generally want to end up with is:
 *   @at-rule {
 *     .rule {
 *       prop: value;
 *     }
 *   }
 * 
 * Therefore, we can just start by wrapping rules with `&`, evaluating it,
 * and pushing `@at-rule` to the root.
 * 
 */
class AtRule extends Node {
    nodes: [string, Node, Ruleset]

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }

        let [
            name,
            prelude,
            rules,
            index,
            fileInfo,
            debugInfo,
            isRooted
        ] = args;

        /** If the prelude has a value, make sure it's a Node */
        prelude = (prelude instanceof Node)
            ? prelude
            : (prelude ? new Anonymous(prelude) : prelude);
        
        if (rules) {
            /**
             * @todo - refactor createEmptySelectors() to remove boilerplate,
             * and create this ruleset properly when calling new AtRule()
             */
            rules.selectors = Selector.createEmptySelectors(index, fileInfo);
            rules.allowImports = true;
        }
        super(
            [
                name,
                prelude,
                rules
            ],
            { isRooted: !!isRooted },
            index,
            fileInfo
        );
    }

    get name() {
        return this.nodes[0];
    }
    get value() {
        return this.nodes[1];
    }
    get rules() {
        return this.nodes[2];
    }
    set rules(r: Ruleset) {
        this.nodes[2] = r;
    }

    isRulesetLike() {
        return !!this.rules || !this.isCharset();
    }

    isCharset() {
        return '@charset' === this.name;
    }

    genCSS(context: Context, output: OutputCollector) {
        const value = this.value;
        const rules = this.rules;

        output.add(this.name, this.fileInfo(), this.getIndex());
        if (value) {
            output.add(' ');
            value.genCSS(context, output);
        }
        if (rules) {
            this.outputRuleset(context, output, rules);
        } else {
            output.add(';');
        }
    }

    eval(context: Context): Node {
        let mediaPathBackup, mediaBlocksBackup;
        let value = this.value;
        let rules = this.rules;

        // media stored inside other atrule should not bubble over it
        // backpup media bubbling information
        mediaPathBackup = context.mediaPath;
        mediaBlocksBackup = context.mediaBlocks;
        // deleted media bubbling information
        context.mediaPath = [];
        context.mediaBlocks = [];

        if (value) {
            value = value.eval(context);
        }
        if (rules) {
            // assuming that there is only one rule at this point - that is how parser constructs the rule
            rules = rules.eval(context);
            rules.root = true;
        }
        // restore media bubbling information
        context.mediaPath = mediaPathBackup;
        context.mediaBlocks = mediaBlocksBackup;

        return new AtRule(
            [this.name, value, rules],
            {...this.options },
            this._location,
            this._fileInfo
        );
    }

    variable(name) {
        if (this.rules) {
            return Ruleset.prototype.variable.call(this.rules, name);
        }
    }

    find() {
        if (this.rules) {
            return Ruleset.prototype.find.apply(this.rules, arguments);
        }
    }

    rulesets() {
        if (this.rules) {
            return Ruleset.prototype.rulesets.apply(this.rules);
        }
    }

    outputRuleset(context: Context, output: OutputCollector, rules: Ruleset) {
        context.tabLevel = (context.tabLevel | 0) + 1;

        // Compressed
        if (context.options.compress) {
            output.add('{');
            rules.genCSS(context, output);
            output.add('}');
            context.tabLevel--;
            return;
        }

        // Non-compressed
        const tabSetStr = `\n${Array(context.tabLevel).join('  ')}`;
        const tabRuleStr = `${tabSetStr}  `;

        output.add(` {${tabRuleStr}`);
        rules.genCSS(context, output);
        output.add(`${tabSetStr}}`);

        context.tabLevel--;
    }
}
AtRule.prototype.type = 'AtRule';
AtRule.prototype.allowRoot = true;
export default AtRule;
