/**
 * Math utilities
 */

/**
 * Math for node expressions
 */
export const add = (a: number, b: number) => a + b
export const subtract = (a: number, b: number) => a - b
export const multiply = (a: number, b: number) => a * b
export const divide = (a: number, b: number) => a / b

export const operate = (op: string, a: number, b: number): number => {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '*':
      return a * b
    case '/':
      return a / b
  }
}

export const fround = (value: number, precision: number = 8) => {
  // add "epsilon" to ensure numbers like 1.000000005 (represented as 1.000000004999...) are properly rounded:
  return Number((value + 2e-16).toFixed(precision))
}
