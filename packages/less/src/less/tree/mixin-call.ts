import Node, { IFileInfo, ILocationInfo, INodeOptions, isNodeArgs } from './node';
import { Selector, Element, List, Ruleset, MixinDefinition } from '.';
import defaultFunc from '../functions/default';
import type { Context } from '../contexts';

type V1Args = [
    elements: Element[],
    args: Node[],
    index: number,
    fileInfo: IFileInfo,
    important: boolean
];

type MixinArgs = [
    value: { selector: Selector, args: List },
    options: INodeOptions,
    location?: ILocationInfo,
    fileInfo?: IFileInfo
];

class MixinCall extends Node {
    type: 'MixinCall'
    selector: Selector;
    args: Node[];
    options: {
        important: boolean
    };
    constructor(...callArgs: MixinArgs | V1Args) {
        if (isNodeArgs(callArgs)) {
            super(...callArgs);
            return;
        }
        const [
            elements,
            args,
            index,
            fileInfo,
            important
        ] = callArgs;

        super(
            {
                selector: new Selector(elements),
                args: args || []
            },
            { important },
            index,
            fileInfo
        );
    }

    /** Historical compatibility */
    get arguments() {
        return this.args;
    }

    /**
     * @todo
     * This seems very complex and has a lot of loops
     * and recursion. Can it be refactored / re-written?
     * 
     * At the least, break this up into testable utilities.
     */
    eval(context: Context): Ruleset {
        let mixins;
        let mixin;
        let mixinPath;
        const args = [];
        let arg;
        let argValue;
        const rules = [];
        let match = false;
        let isRecursive;
        let isOneFound;
        const candidates = [];
        let candidate;
        const conditionResult = [];
        let defaultResult;
        const defFalseEitherCase = -1;
        const defNone = 0;
        const defTrue = 1;
        const defFalse = 2;
        let count;
        let originalRuleset;
        let noArgumentsFilter;

        this.selector = this.selector.eval(context);

        function calcDefGroup(mixin, mixinPath) {
            let namespace;

            for (let f = 0; f < 2; f++) {
                conditionResult[f] = true;
                defaultFunc.value(f);
                for (let p = 0; p < mixinPath.length && conditionResult[f]; p++) {
                    namespace = mixinPath[p];
                    if (namespace.matchCondition) {
                        conditionResult[f] = conditionResult[f] && namespace.matchCondition(null, context);
                    }
                }
                if (mixin.matchCondition) {
                    conditionResult[f] = conditionResult[f] && mixin.matchCondition(args, context);
                }
            }
            if (conditionResult[0] || conditionResult[1]) {
                if (conditionResult[0] != conditionResult[1]) {
                    return conditionResult[1] ?
                        defTrue : defFalse;
                }

                return defNone;
            }
            return defFalseEitherCase;
        }

        for (let i = 0; i < this.args.length; i++) {
            arg = this.args[i];
            argValue = arg.value.eval(context);
            if (arg.expand && Array.isArray(argValue.value)) {
                argValue = argValue.value;
                for (let m = 0; m < argValue.length; m++) {
                    args.push({value: argValue[m]});
                }
            } else {
                args.push({name: arg.name, value: argValue});
            }
        }

        noArgumentsFilter = function(rule) {return rule.matchArgs(null, context);};

        for (let i = 0; i < context.frames.length; i++) {
            if ((mixins = context.frames[i].find(this.selector, null, noArgumentsFilter)).length > 0) {
                isOneFound = true;

                // To make `default()` function independent of definition order we have two "subpasses" here.
                // At first we evaluate each guard *twice* (with `default() == true` and `default() == false`),
                // and build candidate list with corresponding flags. Then, when we know all possible matches,
                // we make a final decision.

                for (let m = 0; m < mixins.length; m++) {
                    mixin = mixins[m].rule;
                    mixinPath = mixins[m].path;
                    isRecursive = false;
                    for (let f = 0; f < context.frames.length; f++) {
                        if ((!(mixin instanceof MixinDefinition)) && mixin === (context.frames[f].originalRuleset || context.frames[f])) {
                            isRecursive = true;
                            break;
                        }
                    }
                    if (isRecursive) {
                        continue;
                    }

                    if (mixin.matchArgs(args, context)) {
                        candidate = {mixin, group: calcDefGroup(mixin, mixinPath)};

                        if (candidate.group !== defFalseEitherCase) {
                            candidates.push(candidate);
                        }

                        match = true;
                    }
                }

                defaultFunc.reset();

                count = [0, 0, 0];
                for (let m = 0; m < candidates.length; m++) {
                    count[candidates[m].group]++;
                }

                if (count[defNone] > 0) {
                    defaultResult = defFalse;
                } else {
                    defaultResult = defTrue;
                    if ((count[defTrue] + count[defFalse]) > 1) {
                        throw { type: 'Runtime',
                            message: `Ambiguous use of \`default()\` found when matching for \`${this.format(args)}\``,
                            index: this.getIndex(), filename: this.fileInfo.filename };
                    }
                }

                for (let m = 0; m < candidates.length; m++) {
                    candidate = candidates[m].group;
                    if ((candidate === defNone) || (candidate === defaultResult)) {
                        try {
                            mixin = candidates[m].mixin;
                            if (!(mixin instanceof MixinDefinition)) {
                                originalRuleset = mixin.originalRuleset || mixin;
                                mixin = new MixinDefinition('', [], mixin.rules, null, false).inherit(originalRuleset);
                                mixin.originalRuleset = originalRuleset;
                            }
                            const newRules = mixin.evalCall(context, args, this.options.important).rules;
                            this._setVisibilityToReplacement(newRules);
                            Array.prototype.push.apply(rules, newRules);
                        } catch (e) {
                            throw { message: e.message, index: this.getIndex(), filename: this.fileInfo.filename, stack: e.stack };
                        }
                    }
                }

                if (match) {
                    return new Ruleset(null, rules).inherit(this);
                }
            }
        }
        if (isOneFound) {
            throw { type:    'Runtime',
                message: `No matching definition was found for \`${this.format(args)}\``,
                index:   this.getIndex(), filename: this.fileInfo.filename };
        } else {
            throw { type:    'Name',
                message: `${this.selector.toCSS().trim()} is undefined`,
                index:   this.getIndex(), filename: this.fileInfo.filename };
        }
    }

    _setVisibilityToReplacement(replacement) {
        let i, rule;
        if (this.blocksVisibility()) {
            for (i = 0; i < replacement.length; i++) {
                rule = replacement[i];
                rule.addVisibilityBlock();
            }
        }
    }

    /** @todo - rely on list formatting */
    format(args) {
        return `${this.selector.toCSS().trim()}(${args ? args.map(function (a) {
            let argValue = '';
            if (a.name) {
                argValue += `${a.name}:`;
            }
            if (a.value.toCSS) {
                argValue += a.value.toCSS();
            } else {
                /** @todo - document */
                argValue += '???';
            }
            return argValue;
        }).join(', ') : ''})`;
    }
}

MixinCall.prototype.allowRoot = true;
MixinCall.prototype.type = 'MixinCall';
export default MixinCall;
