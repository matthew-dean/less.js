import { LessFunction, FunctionError } from '../types'

/**
 * Supports run-time type checking of Less functions 
 */
export const define = (func: LessFunction, ...params: any[][]) => {
  return function(...args: any[]) {
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

export function expect<T = any>(value: any, types: (new(...args: any[]) => T)[]): value is (T extends typeof value ? T : never) {
  let matchingTypes = 0
  const expected: string[] = []
  types.forEach(t => {
    if (t.constructor === Function
      && (value instanceof <Function>(t as unknown))) {
      matchingTypes += 1
    } else if (t === undefined) {
      if (value === undefined) {
        return true
      }
      throw new SyntaxError(`Value expected.`)
    } else {
      const expectedType = t && t.constructor.name
      if (expectedType) {
        expected.push(expectedType)
      }
    }
  })
  if (matchingTypes === 0) {
    let errorMsg = `Value is not an expected type.`
    if (expected.length > 0) {
      errorMsg += ` Expected: ` + expected.join(' or ')
    }
    throw new SyntaxError(errorMsg)
  }
  return true
}

export const validateParam = (param: any, pos: number) => {
  if (param === undefined) {
    const err: FunctionError = new SyntaxError(`Value expected.`)
    err.pos = 2
    throw err
  }
}