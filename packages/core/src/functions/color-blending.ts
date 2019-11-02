import { Color } from '../tree/nodes'

// Color Blending
// ref: http://www.w3.org/TR/compositing-1

function colorBlend(mode: Function, color1: Color, color2: Color) {
  // result
  const ab = color1.value[3]
  const as = color2.value[3]

  // backdrop
  let cb: number

  let cs: number
  let cr: number

  const r = new Array(4)

  let ar = as + ab * (1 - as)
  r[3] = ar
  for (let i = 0; i < 3; i++) {
    cb = color1.value[i] / 255
    cs = color2.value[i] / 255
    cr = mode(cb, cs)
    if (ar) {
      cr = (as * cs + ab * (cb -
            as * (cb + cs - cr))) / ar
    }
    r[i] = cr * 255
  }

  return new Color(r)
}

const colorBlendModeFunctions = {
  multiply(cb: number, cs: number): number {
    return cb * cs
  },
  screen(cb: number, cs: number): number {
    return cb + cs - cb * cs
  },
  overlay(cb: number, cs: number): number {
    cb *= 2
    return (cb <= 1) ?
      colorBlendModeFunctions.multiply(cb, cs) :
      colorBlendModeFunctions.screen(cb - 1, cs)
  },
  softlight(cb: number, cs: number): number {
    let d = 1
    let e = cb
    if (cs > 0.5) {
      e = 1
      d = (cb > 0.25) ? Math.sqrt(cb)
          : ((16 * cb - 12) * cb + 4) * cb
    }
    return cb - (1 - 2 * cs) * e * (d - cb)
  },
  hardlight(cb: number, cs: number): number {
    return colorBlendModeFunctions.overlay(cs, cb)
  },
  difference(cb: number, cs: number): number {
    return Math.abs(cb - cs)
  },
  exclusion(cb: number, cs: number): number {
    return cb + cs - 2 * cb * cs
  },

  // non-w3c functions:
  average(cb: number, cs: number): number {
    return (cb + cs) / 2
  },
  negation(cb: number, cs: number): number {
    return 1 - Math.abs(cb + cs - 1)
  }
}

for (const f in colorBlendModeFunctions) {
  if (colorBlendModeFunctions.hasOwnProperty(f)) {
    colorBlend[f] = function() {
      colorBlend.bind(this, colorBlendModeFunctions[f])
    }
  }
}

export default colorBlend
