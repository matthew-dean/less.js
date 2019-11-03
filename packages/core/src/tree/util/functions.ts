import { Node, Func, MatchOption } from '../nodes'
import { Context } from '../context'

/**
 * This will return a function-like construct, that we can call with arguments
 */
export const getFunction = (callingNode: Node, name: string, context: Context) => {
  const result = callingNode.find(
    context,
    (node: Node) => {
      if (node instanceof Func && node.name === name) {
        return node
      }
    },
    MatchOption.FIRST
  )

  if (result) {
    /** This is an AST Func Node */
    return {
      call(args: Node[]) {}
    }
  } else {
    const jsFunction = context.scope[name]
    if (jsFunction && jsFunction.constructor === Function) {
      return {
        call(args: Node[]) {
          const result = jsFunction.apply(context, args)
        }
      }
    }
  }
}

class functionCaller {
  constructor(name, context, index, currentFileInfo) {
    this.name = name.toLowerCase()
    this.index = index
    this.context = context
    this.currentFileInfo = currentFileInfo

    this.func = context.frames[0].functionRegistry.get(this.name)
  }

  isValid() {
    return Boolean(this.func)
  }

  call(args) {
    // This code is terrible and should be replaced as per this issue...
    // https://github.com/less/less.js/issues/2477
    if (Array.isArray(args)) {
      args = args
        .filter(item => {
          if (item.type === 'Comment') {
            return false
          }
          return true
        })
        .map(item => {
          if (item.type === 'Expression') {
            const subNodes = item.value.filter(item => {
              if (item.type === 'Comment') {
                return false
              }
              return true
            })
            if (subNodes.length === 1) {
              return subNodes[0]
            } else {
              return new Expression(subNodes)
            }
          }
          return item
        })
    }

    return this.func(...args)
  }
}

export default functionCaller
