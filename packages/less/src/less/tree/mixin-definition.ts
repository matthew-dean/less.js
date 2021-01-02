import { Selector, Ruleset, Declaration, DetachedRuleset, Expression } from '.';
import * as utils from '../utils';
import Node, { NodeArgs } from './node';
import type { Context } from '../contexts';
import type Visitor from '../visitors/visitor';

/**
 * @todo - This seems like a strange one-off,
 *         but this seems to be the type according
 *         to the historical parser.
 * 
 *         Refactor into a proper Node?
 */
export type MixinDefinitionArg = {
    name: string;
    value: Node;
    expand?: boolean;
    variadic?: boolean;
}

type V1Args = [
    name: string,
    params: MixinDefinitionArg[] | undefined,
    rules: Node[],
    condition: Node | undefined,
    variadic: boolean
];

const isNodeArgs = (args: V1Args | NodeArgs): args is NodeArgs => {
    return !(Array.isArray(args[2])) && Array.isArray(args[0])
};
/**
 * A mixin definition
 */
class Definition extends Ruleset {
    type: 'MixinDefinition';
    required: number;
    arity: number;
    optionalParameters: string[];
    frames: Ruleset[];
    options: {
        variadic: boolean;
    }
    nodes: [
        name: string,
        rules: Node[],
        params: MixinDefinitionArg[],
        condition: Node
    ]

    constructor(...args: NodeArgs | V1Args) {
        let [
            name,
            params,
            rules,
            condition,
            variadic
        ] = args;
        
        let options;
        let location;
        let fileInfo;

        if (isNodeArgs(args)) {
            options = params;
            location = rules;
            fileInfo = condition;
            rules = name[1];
            params = name[2];
            condition = name[3];
            name = name[0];
        } else {
            options = { variadic };
        }

        name = name || 'anonymous mixin';

        super(
            [
                name,   // In base Ruleset, this would be selectors
                rules,  // Aligns with base Ruleset order
                params,
                condition
            ],
            options,
            location,
            fileInfo
        );

        this.selectors = Selector.createEmptySelectors(0, fileInfo);
        this.arity = params ? (<MixinDefinitionArg[]>params).length : 0;
        this._lookups = {};

        /**
         * @todo - refactor
         */
        const optionalParameters = [];
        this.required = (<MixinDefinitionArg[]>params).reduce(function (count, p) {
            if (!p.name || (p.name && !p.value)) {
                return count + 1;
            }
            else {
                optionalParameters.push(p.name);
                return count;
            }
        }, 0);
        this.optionalParameters = optionalParameters;
    }

    get name() {
        return this.nodes[0];
    }
    get params() {
        return this.nodes[2];
    }
    get condition() {
        return this.nodes[3]
    }

    accept(visitor: Visitor) {
        /**
         * Upon investigation, params aren't actually nodes?
         */
        if (this.params && this.params.length) {
            this.nodes[2] = this.params.map(
                ({ name, value, expand }) => {
                    return {
                        name,
                        value: visitor.visit(value),
                        expand
                    }
                });
        }
        this.rules = visitor.visitArray(this.rules);
        if (this.condition) {
            this.nodes[3] = visitor.visit(this.condition);
        }
    }

    evalParams(context: Context, mixinEnv: Context, args, evaldArguments) {
        /* jshint boss:true */
        const frame = new Ruleset(null, []);

        let varargs;
        let arg;
        const params = utils.copyArray(this.params);
        let val;
        let name;
        let isNamedFound;
        let argIndex;
        let argsLength = 0;

        if (mixinEnv.frames && mixinEnv.frames[0] && mixinEnv.frames[0].functionRegistry) {
            frame.functionRegistry = mixinEnv.frames[0].functionRegistry.inherit();
        }
        mixinEnv = context.create([frame].concat(mixinEnv.frames));

        if (args) {
            args = utils.copyArray(args);
            argsLength = args.length;

            for (let i = 0; i < argsLength; i++) {
                arg = args[i];
                if (name = (arg && arg.name)) {
                    isNamedFound = false;
                    for (let j = 0; j < params.length; j++) {
                        if (!evaldArguments[j] && name === params[j].name) {
                            evaldArguments[j] = arg.value.eval(context);
                            frame.prependRule(new Declaration(name, arg.value.eval(context)));
                            isNamedFound = true;
                            break;
                        }
                    }
                    if (isNamedFound) {
                        args.splice(i, 1);
                        i--;
                        continue;
                    } else {
                        throw { type: 'Runtime', message: `Named argument for ${this.name} ${args[i].name} not found` };
                    }
                }
            }
        }
        argIndex = 0;
        for (let i = 0; i < params.length; i++) {
            if (evaldArguments[i]) { continue; }

            arg = args && args[argIndex];

            if (name = params[i].name) {
                if (params[i].variadic) {
                    varargs = [];
                    for (let j = argIndex; j < argsLength; j++) {
                        varargs.push(args[j].value.eval(context));
                    }
                    frame.prependRule(new Declaration(name, new Expression(varargs).eval(context)));
                } else {
                    val = arg && arg.value;
                    if (val) {
                        // This was a mixin call, pass in a detached ruleset of it's eval'd rules
                        if (Array.isArray(val)) {
                            val = new DetachedRuleset(new Ruleset('', val));
                        }
                        else {
                            val = val.eval(context);
                        }
                    } else if (params[i].value) {
                        val = params[i].value.eval(mixinEnv);
                        frame.resetCache();
                    } else {
                        throw { type: 'Runtime', message: `wrong number of arguments for ${this.name} (${argsLength} for ${this.arity})` };
                    }

                    frame.prependRule(new Declaration(name, val));
                    evaldArguments[i] = val;
                }
            }

            if (params[i].variadic && args) {
                for (let j = argIndex; j < argsLength; j++) {
                    evaldArguments[j] = args[j].value.eval(context);
                }
            }
            argIndex++;
        }

        return frame;
    }

    makeImportant() {
        const rules = !this.rules ? this.rules : this.rules.map(function (r) {
            if (r.makeImportant) {
                return r.makeImportant();
            } else {
                return r;
            }
        });
        const result = this.clone()
        result.rules = rules;
        return result;
    }

    eval(context: Context) {
        const result = this.clone();
        result.frames = utils.copyArray(context.frames);
        return result;
    }

    evalCall(context: Context, args, important) {
        const _arguments = [];
        const mixinFrames = this.frames ? this.frames.concat(context.frames) : context.frames;
        const frame = this.evalParams(context, context.create(mixinFrames), args, _arguments);
        let rules;
        let ruleset;

        frame.prependRule(new Declaration('@arguments', new Expression(_arguments).eval(context)));

        rules = utils.copyArray(this.rules);

        ruleset = new Ruleset(null, rules);
        ruleset.originalRuleset = this;
         // was [this, frame], but frames should be rulesets?
        ruleset = ruleset.eval(context.create([frame].concat(mixinFrames)));
        if (important) {
            ruleset = ruleset.makeImportant();
        }
        return ruleset;
    }

    matchCondition(args, context) {
        if (this.condition && !this.condition.eval(
            context.create(
                [this.evalParams(context, /* the parameter variables */
                    context.create(this.frames ? this.frames.concat(context.frames) : context.frames), args, [])]
                    .concat(this.frames || []) // the parent namespace/mixin frames
                    .concat(context.frames)))
        ) { // the current environment frames
            return false;
        }
        return true;
    }

    matchArgs(args: MixinDefinitionArg[], context: Context) {
        const allArgsCnt = (args && args.length) || 0;
        let len;
        const optionalParameters = this.optionalParameters;
        const requiredArgsCnt = !args ? 0 : args.reduce(function (count, p) {
            if (optionalParameters.indexOf(p.name) < 0) {
                return count + 1;
            } else {
                return count;
            }
        }, 0);

        if (!this.options.variadic) {
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

Definition.prototype.evalFirst = true;
Definition.prototype.allowRoot = true;

export default Definition;
