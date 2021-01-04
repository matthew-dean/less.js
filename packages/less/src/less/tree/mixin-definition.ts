import { Selector, Element, Ruleset, Declaration, DetachedRuleset, Expression, MixinArg } from '.';
import * as utils from '../utils';
import Node, { NodeArgs, isNodeArgs, INodeOptions, ILocationInfo, IFileInfo } from './node';
import type { Context } from '../contexts';
import type Visitor from '../visitors/visitor';


type V1Args = [
    name: string,
    params: MixinArg[] | undefined,
    rules: Node[],
    condition: Node | undefined,
    variadic: boolean
];

type DefinitionArgs = [
    nodes: {
        name: string,
        selectors?: Selector[],
        params?: MixinArg[],
        rules: Node[],
        condition?: Node
    },
    options: INodeOptions,
    location: ILocationInfo,
    fileInfo: IFileInfo
];

/**
 * A mixin definition
 */
class Definition extends Ruleset {
    type: 'MixinDefinition'
    required: number
    arity: number

    name: string
    params: MixinArg[]
    condition: Node

    optionalParameters: string[];
    frames: Ruleset[];
    options: {
        variadic: boolean;
    }

    constructor(...args: DefinitionArgs | V1Args) {
        let name: string
        let params: MixinArg[]
        let condition: Node
        let rules: Node[];
        let options: INodeOptions;
        let location: ILocationInfo;
        let fileInfo: IFileInfo;
        let selectors: Selector[];

        if (isNodeArgs(args)) {
            const [
                nodes,
                opts,
                loc,
                file
            ] = args;
            name = nodes.name;
            params = nodes.params;
            rules = nodes.rules;
            condition = nodes.condition;
            selectors = nodes.selectors;

            options = opts;
            location = loc;
            fileInfo = file;
        } else {
            const [
                nme,
                prms,
                rule,
                cond,
                variadic
            ] = <V1Args>args;
            options = { variadic };
            name = nme;
            params = prms;
            rules = rule;
            condition = cond;
        }
        name = name || 'anonymous mixin';
        selectors = selectors || [new Selector([
            new Element({ combinator: null, value: name }, {}, location, fileInfo)]
        )];

        super(
            {
                name,
                selectors,
                rules,
                params,
                condition
            },
            options,
            location,
            fileInfo
        );

        this.name = name;
        this.arity = params ? (<MixinArg[]>params).length : 0;
        this._lookups = {};

        /**
         * @todo - refactor
         */
        const optionalParameters = [];
        this.required = (<MixinArg[]>params).reduce(function (count, p) {
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
                if (params[i].options.variadic) {
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

            if (params[i].options.variadic && args) {
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
        ruleset = ruleset.eval(context.create([this, frame].concat(mixinFrames)));
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

    matchArgs(args: MixinArg[], context: Context) {
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
            if (!this.params[i].name && !this.params[i].options.variadic) {
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
Definition.prototype.type = 'MixinDefinition';

export default Definition;
