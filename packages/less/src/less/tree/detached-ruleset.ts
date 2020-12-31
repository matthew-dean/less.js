import Node from './node';
import { Context } from '../contexts';
import * as utils from '../utils';

/**
 * @todo - rewrite and make sense of "frames"
 */
class DetachedRuleset extends Node {
    type: 'DetachedRuleset'
    frames: any[]

    get ruleset() {
        return this.value;
    }

    eval(context: Context) {
        if (!this.evaluated) {
            this.evaluated = true;
            this.frames = utils.copyArray(context.frames);
        }
        return this;
    }

    callEval(context: Context) {
        return this.ruleset.eval(
            this.frames
                ? context.create(this.frames.concat(context.frames))
                : context
        );
    }
}

DetachedRuleset.prototype.evalFirst = true;
DetachedRuleset.prototype.type = 'DetachedRuleset';

export default DetachedRuleset;
