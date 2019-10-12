import { Less } from '../index'

export function boolean(this: Less, condition) {
  return condition ? Keyword.True : Keyword.False
}