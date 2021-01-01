import Node, { IFileInfo, isNodeArgs, NodeArgs } from './node';
import Variable from './variable';
import Ruleset from './ruleset';
import DetachedRuleset from './detached-ruleset';
import LessError from '../less-error';
import type { Context } from '../contexts';

type V1Args = [
    variable: string,
    index: number,
    fileInfo: IFileInfo
];

class VariableCall extends Node {
    type: 'VariableCall'

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }
        const [
            variable,
            index,
            fileInfo
        ] = args;
        super(variable, {}, index, fileInfo);
    }

    get variable() {
        return this.nodes;
    }

    eval(context: Context) {
        let rules;
        let detachedRuleset = new Variable(this.variable, this.getIndex(), this.fileInfo()).eval(context);
        const error = new LessError({message: `Could not evaluate variable call ${this.variable}`});

        if (!detachedRuleset.ruleset) {
            if (detachedRuleset.rules) {
                rules = detachedRuleset;
            }
            else if (Array.isArray(detachedRuleset)) {
                rules = new Ruleset('', detachedRuleset);
            }
            else if (Array.isArray(detachedRuleset.value)) {
                rules = new Ruleset('', detachedRuleset.value);
            }
            else {
                throw error;
            }
            detachedRuleset = new DetachedRuleset(rules);
        }

        if (detachedRuleset.ruleset) {
            return detachedRuleset.callEval(context);
        }
        throw error;
    }
}

VariableCall.prototype.type = 'VariableCall';
VariableCall.prototype.allowRoot = true;

export default VariableCall;
