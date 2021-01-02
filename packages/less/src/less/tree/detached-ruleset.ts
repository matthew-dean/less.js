import Node from './node';
import { Context } from '../contexts';
import * as utils from '../utils';

/**
 * @todo - rewrite and make sense of "frames"
 */
class DetachedRuleset extends Node {
    type: 'DetachedRuleset'
    frames: any[];

    constructor(ruleset, frames?) {
        super(ruleset);
        this.frames = frames;
    }

    get ruleset() {
        return this.nodes;
    }

    accept(visitor) {
        this.nodes = visitor.visit(this.nodes);
    }

    eval(context: Context) {
        const frames = this.frames || utils.copyArray(context.frames);
        return new DetachedRuleset(this.ruleset, frames);
    }

    callEval(context: Context) {
        return this.ruleset.eval(this.frames ? context.create(this.frames.concat(context.frames)) : context);
    }
}

DetachedRuleset.prototype.evalFirst = true;
DetachedRuleset.prototype.type = 'DetachedRuleset';

export default DetachedRuleset;
