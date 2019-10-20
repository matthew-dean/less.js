import {
  Declaration,
  Node,
  IProps,
  INodeOptions,
  ILocationInfo,
  Rules,
  Variable
} from '.'

import { Context } from '../context'

export type IMixinDefinitionProps = IProps & {
  rules: [Rules]
  params?: (Declaration | Variable)[]
  condition?: [Node]
}

/**
 * This is an abstraction from a mixin, formerly
 * a "detached ruleset". This is a set of rules with arguments.
 */
export class MixinDefinition extends Node {
  rules: [Rules]
  /**
   * e.g. `@var`        <Variable 'var'> or
   *      `@var: value` <Declaration {name: var, nodes: [value] }>
   */
  params: (Declaration | Variable)[] | undefined
  condition: [Node] | undefined

  constructor(props: IMixinDefinitionProps, options?: INodeOptions, location?: ILocationInfo) {
    super(props, options, location)
  }

  /**
   * Only the mixin params will be eval'd.
   * Rules / condition are eval'd in a mixin call
   */
  eval(context: Context) {
    if (!this.evaluated) {
      const params = this.params
      if (params) {
        params.forEach(param => param.evalName(context))
      }
      this.evaluated = true
    }
    return this
  }

  /**
   * Evaluates the mixin arguments
   */
  evalParams(callContext: Context, args?: Node[]) {
    const frame = this.rules[0].clone()
    const params = this.params

    let paramsLength = 0
    let argsLength = 0
    let evaldArguments: Node[]
  
    if (params) {
      paramsLength = params.length
    }
    if (args) {
      argsLength = params.length
      evaldArguments = new Array(argsLength)
    }
    
    let val
    let name: string
    let isNamedFound: boolean
    let argIndex
    

    // if (mixinEnv.frames && mixinEnv.frames[0] && mixinEnv.frames[0].functionRegistry) {
    //   frame.functionRegistry = mixinEnv.frames[0].functionRegistry.inherit()
    // }
    // mixinEnv = new contexts.Eval(mixinEnv, [frame].concat(mixinEnv.frames));

    if (args) {
      argsLength = args.length

      for (let i = 0; i < argsLength; i++) {
        const arg = args[i]
        if (arg instanceof Declaration) {
          name = arg.value
          isNamedFound = false
          for (let j = 0; j < params.length; j++) {
            const param = params[j]
            if (!evaldArguments[j] && name === params[j].value) {
              evaldArguments[j] = arg.nodes[0]
              frame.prependRule(new Declaration({ name, nodes: arg.nodes }))
              isNamedFound = true
              break
            }
          }
          if (isNamedFound) {
            args.splice(i, 1)
            i--
            continue
          } else {
            this.error(callContext, 
              `Named argument matching '${arg.toString(true)}' not found`
            )
          }
        }
      }
    }
    argIndex = 0
    for (let i = 0; i < params.length; i++) {
      if (evaldArguments[i]) { continue }
      const param = params[i]
      const arg = args && args[argIndex]

        if (name = param.value) {
          if (param instanceof Variable && param.options.variadic) {
            const varargs = []
            for (let j = argIndex; j < argsLength; j++) {
              varargs.push(args[j].value)
            }
            frame.prependRule(new Declaration(name, new Expression(varargs).eval(context)));
          } else {
              val = arg && arg.value;
              if (val) {
                  // This was a mixin call, pass in a detached rules of it's eval'd rules
                  if (Array.isArray(val)) {
                      val = new DetachedRules(new Rules('', val));
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
            for (j = argIndex; j < argsLength; j++) {
                evaldArguments[j] = args[j].value.eval(context);
            }
        }
        argIndex++;
    }

    return frame;
  }
}