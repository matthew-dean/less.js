import {
  Node,
  NodeArray,
  INodeOptions,
  ILocationInfo,
  Rules,
  Declaration,
  Expression,
  Rule,
  IRuleProps,
  MixinDefinition
} from '.'

import { Context } from '../context'

/**
 * @todo - Store the mixin name without '.' or '#' for cross-format compatibility
 *         This makes .mixin() {} the equivalent of `@mixin mixin()`
 *         and .mixin(); is the equivalent of `@include mixin()`
 */
export class Mixin extends NodeArray {
  /**
   * First node is the mixin name, second is the definition
   */
  nodes: [Node, MixinDefinition]

  makeImportant() {
    const rules = !this.rules ? this.rules : this.rules.map(r => {
        if (r.makeImportant) {
            return r.makeImportant(true);
        } else {
            return r;
        }
    });
    const result = new Definition(this.name, this.params, rules, this.condition, this.variadic, this.frames);
    return result;
  }

  evalCall(context, args, important) {
    const _arguments = [];
    const mixinFrames = this.frames ? this.frames.concat(context.frames) : context.frames;
    const frame = this.evalParams(context, new contexts.Eval(context, mixinFrames), args, _arguments);
    let rules: Rules

    frame.prependRule(new Declaration('@arguments', new Expression(_arguments).eval(context)))

    rules = [...this.rules[0]]

    rules = new Rules(null, rules)

    // rules.originalRules = this;
    rules = rules.eval(new contexts.Eval(context, [this, frame].concat(mixinFrames)))
    if (important) {
        rules = rules.makeImportant()
    }
    return rules
  }

  matchCondition(args, context) {
      if (this.condition && !this.condition.eval(
          new contexts.Eval(context,
              [this.evalParams(context, /* the parameter variables */
                  new contexts.Eval(context, this.frames ? this.frames.concat(context.frames) : context.frames), args, [])]
                  .concat(this.frames || []) // the parent namespace/mixin frames
                  .concat(context.frames)))) { // the current environment frames
          return false;
      }
      return true;
  }

  matchArgs(args, context) {
    const allArgsCnt = (args && args.length) || 0;
    let len;
    const optionalParameters = this.optionalParameters;
    const requiredArgsCnt = !args ? 0 : args.reduce((count, p) => {
        if (optionalParameters.indexOf(p.name) < 0) {
            return count + 1;
        } else {
            return count;
        }
    }, 0);

    if (!this.variadic) {
        if (requiredArgsCnt < this.required) {
            return false;
        }
        if (allArgsCnt > this.params.length) {
            return false;
        }
    } else {
        if (requiredArgsCnt < (this.required - 1)) {
            return false;
        }
    }

    // check patterns
    len = Math.min(requiredArgsCnt, this.arity);

    for (let i = 0; i < len; i++) {
        if (!this.params[i].name && !this.params[i].variadic) {
            if (args[i].value.eval(context).toCSS() != this.params[i].value.eval(context).toCSS()) {
                return false;
            }
        }
    }
    return true;
  }
}

Mixin.prototype.type = 'Mixin'
Mixin.prototype.evalFirst = true
