import { NodeArgs, isNodeArgs, IFileInfo, OutputCollector } from './node';
import { Node, Selector, Ruleset, Anonymous } from '.';
import type { Context } from '../contexts';

type V1Args = [
    name: string,
    prelude: Node | string,
    rules: Ruleset[], // I guess?
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
    name: string
    value: Node
    rules: Ruleset[]

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }

        let [
            name,
            value,
            rules,
            index,
            fileInfo,
            debugInfo,
            isRooted
        ] = args;

        /** If the prelude has a value, make sure it's a Node */
        value = (value instanceof Node)
            ? value
            : (value ? new Anonymous(value) : value);
        
        if (rules) {
            /**
             * @todo - Figure out why there are multiple rulesets
             *         and only rulesets?
             */
            if (!(Array.isArray(rules))) {
                rules = [rules];
                rules[0].selectors = Selector.createEmptySelectors(index, fileInfo);
            }
            for (let i = 0; i < rules.length; i++) {
                rules[i].allowImports = true;
            }
        }
        super(
            {
                name,
                value,
                rules
            },
            { isRooted: !!isRooted },
            index,
            fileInfo
        );
    }

    isRulesetLike() {
        return !!this.rules || !this.isCharset();
    }

    isCharset() {
        return '@charset' === this.name;
    }

    genCSS(context: Context, output: OutputCollector) {
        const value = this.value, rules = this.rules;
        output.add(this.name, this.fileInfo, this.getIndex());
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

    eval(context: Context) {
        let mediaPathBackup, mediaBlocksBackup, value = this.value, rules = this.rules;

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
            rules = [rules[0].eval(context)];
            (<Ruleset>rules[0]).root = true;
        }
        // restore media bubbling information
        context.mediaPath = mediaPathBackup;
        context.mediaBlocks = mediaBlocksBackup;

        return new AtRule({ name: this.name, value, rules }, {...this.options}).inherit(this);
    }

    variable(name) {
        if (this.rules) {
            // assuming that there is only one rule at this point - that is how parser constructs the rule
            return Ruleset.prototype.variable.call(this.rules[0], name);
        }
    }

    find() {
        if (this.rules) {
            // assuming that there is only one rule at this point - that is how parser constructs the rule
            return Ruleset.prototype.find.apply(this.rules[0], arguments);
        }
    }

    rulesets() {
        if (this.rules) {
            // assuming that there is only one rule at this point - that is how parser constructs the rule
            return Ruleset.prototype.rulesets.apply(this.rules[0]);
        }
    }

    outputRuleset(context, output, rules) {
        const ruleCnt = rules.length;
        let i;
        context.tabLevel = (context.tabLevel | 0) + 1;

        // Compressed
        if (context.compress) {
            output.add('{');
            for (i = 0; i < ruleCnt; i++) {
                rules[i].genCSS(context, output);
            }
            output.add('}');
            context.tabLevel--;
            return;
        }

        // Non-compressed
        const tabSetStr = `\n${Array(context.tabLevel).join('  ')}`, tabRuleStr = `${tabSetStr}  `;
        if (!ruleCnt) {
            output.add(` {${tabSetStr}}`);
        } else {
            output.add(` {${tabRuleStr}`);
            rules[0].genCSS(context, output);
            for (i = 1; i < ruleCnt; i++) {
                output.add(tabRuleStr);
                rules[i].genCSS(context, output);
            }
            output.add(`${tabSetStr}}`);
        }

        context.tabLevel--;
    }
}
AtRule.prototype.type = 'AtRule';
AtRule.prototype.allowRoot = true;
export default AtRule;
