import {
  Context,
  Condition,
  Declaration,
  Expression,
  Node,
  IProps,
  INodeOptions,
  ILocationInfo,
  Rules,
  Name,
  ImportantNode
} from '.'

export type IMixinDefinitionProps = IProps & {
  rules: Rules
  params?: (Declaration | Name)[]
  condition?: Condition
}

/**
 * This is an abstraction from a mixin, formerly
 * a "detached ruleset". This is a set of rules with optional parameters,
 * which can be attached to a variable or a mixin name, or passed
 * into an each() function.
 */
export class MixinDefinition extends Node implements ImportantNode {
  rules: Rules
  /**
   * e.g. `@var`        <Name 'var'> or
   *      `@var: value` <Declaration {name: var, nodes: [value] }>
   */
  params: (Declaration | Name)[]
  condition: Condition | undefined
  arity: number
  required: number
  optionalParameters: string[]
  hasVariadic: boolean

  constructor(props: IMixinDefinitionProps, options?: INodeOptions, location?: ILocationInfo) {
    const { params, ...rest } = props
    super(props, options, location)
    this.arity = params ? params.length : 0
  }

  makeImportant() {
    const oldRules = this.rules.clone()
    const rules = oldRules.nodes.map(r => {
      if (r.hasOwnProperty('makeImportant')) {
        (<ImportantNode>r).makeImportant()
      }
      return r
    })

    const result = this.clone(true)
    result.rules = new Rules(rules).inherit(oldRules)
    return result
  }

  /**
   * Only the mixin params will be eval'd.
   * Rules / condition are eval'd in a mixin call
   */
  eval(context: Context) {
    if (!this.evaluated) {
      const params = this.params
      if (params) {
        params.forEach(param => param.eval(context))
      }
      this.evaluated = true
    }
    return this
  }

  /**
   * Evaluates the mixin arguments
   */
  evalParams(callContext: Context, args: Node[], evaldArguments: Node[]) {
    const frame = this.rules[0].clone()
    const params = this.params

    let paramsLength = 0
    let argsLength = 0
  
    if (params) {
      paramsLength = params.length
    }
    if (args) {
      argsLength = params.length
      evaldArguments = new Array(argsLength)
    }
    
    let name: string
    let isNamedFound: boolean    

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
              frame.prependRule(new Declaration({ name, nodes: arg.nodes }, { isVariable: true }))
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
    let argIndex = 0
    for (let i = 0; i < params.length; i++) {
      if (evaldArguments[i]) { continue }
      const param = params[i]
      const arg = args && args[argIndex]

      if (name = param.value) {
        if (param instanceof Name && param.options.variadic) {
          const varargs = []
          for (let j = argIndex; j < argsLength; j++) {
            varargs.push(args[j])
          }
          frame.prependRule(new Declaration({ name, nodes: [new Expression(varargs, { spaced: true })] }, { isVariable: true }))
        } else {
          let nodes: Node[]
          if (!arg) {
            if (param instanceof Declaration) {
              nodes = param.nodes
            } else {
              this.error(callContext, `wrong number of arguments for mixin (${argsLength} for ${this.arity})` )
            }
          } else {
            nodes = [arg]
          }

          frame.prependRule(new Declaration({ name, nodes }, { isVariable: true }))
          evaldArguments[i] = arg
        }
      }

      /** @todo is this redundant? */
      if (param instanceof Name && param.options.variadic && args) {
        for (let j = argIndex; j < argsLength; j++) {
          evaldArguments[j] = args[j]
        }
      }
      argIndex++
    }

    return frame
  }

  evalCall(context: Context, args: Node[], important: boolean = false) {
    const _arguments = []
    // const mixinFrames = this.frames ? this.frames.concat(context.frames) : context.frames;
    const frame = this.evalParams(context, args, _arguments)
    let rules: Rules

    frame.prependRule(
      new Declaration({
        name: 'arguments',
        nodes: [new Expression(_arguments, { spaced: true })]
      }, { isVariable: true })
    )

    rules = this.rules[0].clone()
    rules = rules.eval(context)

    if (important) {
      rules = rules.makeImportant()
    }
    return rules
  }

  matchCondition(context: Context, args?: Node[]): boolean {
    const frame = this.evalParams(context, args, [])
    let condition = this.condition && this.condition[0]
    if (condition) {
      condition = condition.clone()
      condition.parent = frame
      return condition.eval(context).value
    }
    return true
  }

  matchArgs(context: Context, args?: Node[]): boolean {
    const allArgsCnt = (args && args.length) || 0
    const params = this.params
    let optionalParameters = this.optionalParameters

    if (!optionalParameters) {
      optionalParameters = []
      this.required = params.reduce((count, p) => {
        if (p instanceof Declaration) {
          return count + 1
        }
        else {
          if (p.options.variadic) {
            this.hasVariadic = true
          }
          optionalParameters.push(p.value)
          return count
        }
      }, 0)
      this.optionalParameters = optionalParameters
    }

    const requiredArgsCnt = !args ? 0 : args.reduce((count, p) => {
      if (p instanceof Declaration && optionalParameters.indexOf(p.value) === -1) {
        return count + 1
      } else {
        return count
      }
    }, 0)

    if (!this.hasVariadic) {
      if (requiredArgsCnt < this.required) {
        return false
      }
      if (allArgsCnt > params.length) {
        return false
      }
    } else {
      if (requiredArgsCnt < (this.required - 1)) {
        return false
      }
    }

    // check patterns
    const len = Math.min(requiredArgsCnt, this.arity)

    for (let i = 0; i < len; i++) {
      const param = params[i]
      const arg = args[i]
      if (param instanceof Name && !param.options.variadic) {
        if (arg.toString(true) !== param.toString(true)) {
          return false
        }
      }
    }

    return true
  }
}