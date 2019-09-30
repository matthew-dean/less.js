import { Value } from '.'
/**
 * An Operator.
 * This is used as a generic class for both operators and combinators,
 * to make selector combining easier.
 * 
 * In other words, a selector might be:
 *   <Expression [<Value '#foo'><Op '+'><Value 'p'>]> 
 */
// ' >/* combine */ ' will be parsed as ->
//     new Op({ pre: ' ', post: ' ' text: '>/* combine */', value: '>' })
export class Op extends Value {}
Op.prototype.type = 'Op'