import Node from './node';
import contexts from '../contexts';
import * as utils from '../utils';

/**
 * @todo - rewrite and make sense of "frames"
 */
class DetachedRuleset extends Node {
    type: 'DetachedRuleset'
    frames: any[]

    constructor(ruleset, frames) {
        super(ruleset);
        this.frames = frames;
    }

    get ruleset() {
        return this.value;
    }

    eval(context) {
        const frames = this.frames || utils.copyArray(context.frames);
        return new DetachedRuleset(this.ruleset, frames);
    }

    callEval(context) {
        return this.ruleset.eval(this.frames ? new contexts.Eval(context, this.frames.concat(context.frames)) : context);
    }
}

DetachedRuleset.prototype.evalFirst = true;
DetachedRuleset.prototype.type = 'DetachedRuleset';

export default DetachedRuleset;
