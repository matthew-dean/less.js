import Node, { NodeArgs, isNodeArgs } from './node';
import { Context } from '../contexts';
import * as utils from '../utils';
import { Ruleset } from '.';

type V1Args = [
    ruleset: Ruleset,
    frames?: Ruleset[]
];

/**
 * @todo - rewrite and make sense of "frames"
 */
class DetachedRuleset extends Node {
    type: 'DetachedRuleset'
    frames: Ruleset[];
    ruleset: Ruleset;

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }
        const ruleset = args[0];
        const frames = args[1];
        super({ ruleset });
        this.frames = frames;
    }

    eval(context: Context) {
        const frames = this.frames || utils.copyArray(context.frames);
        const rules = new DetachedRuleset(this.ruleset);
        rules.frames = frames;
        return rules;
    }

    callEval(context: Context) {
        return this.ruleset.eval(this.frames ? context.create(this.frames.concat(context.frames)) : context);
    }
}

DetachedRuleset.prototype.evalFirst = true;
DetachedRuleset.prototype.type = 'DetachedRuleset';

export default DetachedRuleset;
