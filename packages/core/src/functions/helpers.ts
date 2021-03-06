import { LessFunction, FunctionError } from '../types'

/**
 * Supports run-time type checking of Less functions
 * 
 * @todo - Do this as a @decorator instead
 */
export const define = (func: LessFunction, ...params: any[][]) => {
  return function (...args: any[]) {
    params.forEach((param, i) => {
      try {
        expect(args[i], param)
      } catch (e) {
        e.pos = i
        throw e
      }
    })
    return func.call(this, ...args)
  } as LessFunction
}

export function expect<T = any>(
  value: any,
  types: (new (...args: any[]) => T)[]
): value is T extends typeof value ? T : never {
  let match = false
  const expected: string[] = []
  types.forEach(t => {
    if (match) {
      return
    }
    if (t === undefined) {
      if (value === undefined) {
        match = true
        return true
      }
    } else if (t.constructor === Function && value instanceof <Function>(t as unknown)) {
      match = true
    } else {
      const expectedType = t && t.prototype.constructor.name
      if (expectedType) {
        expected.push(expectedType)
      }
    }
  })
  if (!match) {
    let errorMsg = `value '${value}' is not an expected type.`
    if (expected.length > 0) {
      errorMsg += ` Expected: ` + expected.join(' or ')
    }
    throw new SyntaxError(errorMsg)
  }
  return true
}

export const validateParam = (param: any, pos: number) => {
  if (param === undefined) {
    const err: FunctionError = new SyntaxError(`value expected.`)
    err.pos = pos
    throw err
  }
}
