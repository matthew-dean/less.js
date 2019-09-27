import { List, Selector } from '../nodes'

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
