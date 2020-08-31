import { List, Expression, Declaration, Node, MergeType, WS } from '../nodes'

export const mergeProperties = <T extends Node = Node>(rules: T[], clone?: boolean): T[] => {
  const groups: {
    [key: string]: Declaration[]
  } = {}
  const groupsArr: Declaration[][] = []
  const rulesLength = rules.length

  if (clone) {
    rules = rules.map(rule => rule.clone())
  }

  for (let i = 0; i < rulesLength; i++) {
    const rule = rules[i]
    if (rule instanceof Declaration) {
      const opts = rule.options
      if (!opts.isVariable && opts.mergeType) {
        const key = rule.value.toString()
        if (groups[key]) {
          rules.splice(i--, 1)
        } else {
          groupsArr.push((groups[key] = []))
        }
        groups[key].push(rule)
      }
    }
  }

  groupsArr.forEach(group => {
    if (group.length > 0) {
      const result = group[0]

      if (result.options.mergeType === MergeType.SPACED) {
        let important: Node | null = null
        const nodes = group.reduce((nodes, rule, i) => {
          if (i === 0) {
            return
          }
          const ruleNodes = rule.nodes
          const imprt = ruleNodes[1]
          if (!important && imprt) {
            important = imprt
          }
          return nodes.concat([new WS()].concat([ruleNodes[0]]))
        }, result.nodes)
        result.nodes = [new Expression(nodes)]
        if (important) {
          result.nodes.push(important)
        }
      } else {
        let important: Node | null = null
        const nodes = group.reduce((nodes, rule, i) => {
          const ruleNodes = rule.nodes
          const imprt = ruleNodes[1]
          if (!important && imprt) {
            important = imprt
          }
          const expr = new Expression([ruleNodes[0]])
          return nodes.concat([expr])
        }, [])
        result.nodes = [new List(nodes)]
        if (important) {
          result.nodes.push(important)
        }
      }
    }
  })

  return rules
}

// export const flattenSelectors = (selectorList: List<Selector>): List<Selector> => {
// const selectors = selectorList.nodes
//     const createdSelectors: Selector[] = []

//     if (selectors && selectors.length > 0) {
//       selectors.forEach((sel: Selector) => {
//         sel.eval(context)
//         const elements = sel.nodes
//         const selectorList: Element[][] = mergeList(elements)
//         selectorList.forEach(elementList => {
//           const newSelector = sel.clone()
//           newSelector.nodes = elementList
//           createdSelectors.push(newSelector)
//         })
//       })
//       this.children.selectors[0].nodes = createdSelectors
//     }
// return selectorList
// }
