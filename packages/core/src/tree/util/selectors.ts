import { List, Expression, Declaration, Node } from '../nodes'

const mergeProperties = (rules: Node[]) => {
  const groups    = {}
  const groupsArr = []
  const rulesLength = rules.length

  for (let i = 0; i < rulesLength; i++) {
    const rule = rules[i]
    if (rule instanceof Declaration) {
      const opts = rule.options
      if (!opts.isVariable && opts.mergeType) {
        const key = rule.value.toString()
        if (groups[key]) {

        }
      }
    }
    if (rule.merge) {
      const key = rule.name
      groups[key] ? rules.splice(i--, 1) : 
          groupsArr.push(groups[key] = [])
      groups[key].push(rule)
    }
  }

  groupsArr.forEach(group => {
      if (group.length > 0) {
          const result = group[0];
          let space  = [];
          const comma  = [new tree.Expression(space)];
          group.forEach(rule => {
              if ((rule.merge === '+') && (space.length > 0)) {
                  comma.push(new tree.Expression(space = []));
              }
              space.push(rule.value);
              result.important = result.important || rule.important;
          });
          result.value = new tree.Value(comma);
      }
  });
}

export const flattenSelectors = (selectorList: List<Selector>): List<Selector> => {
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
  return selectorList
}
