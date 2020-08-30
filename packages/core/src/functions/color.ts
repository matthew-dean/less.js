import { Dimension, Num, Color, Quoted, Node, Value, ColorFormat } from '../tree/nodes'

import { colorFromKeyword } from '../tree/util/color'
import { define, validateParam } from './helpers'
import { LessFunction } from '../types'

let colorFunctions: {
  [key: string]: LessFunction
}

function clamp(val: number) {
  return Math.min(1, Math.max(0, val))
}

function hsla(origColor: Color, hsl) {
  const color = colorFunctions.hsla.call(this, hsl.h, hsl.s, hsl.l, hsl.a)
  const colorFormat = origColor.options.colorFormat
  color.options.colorFormat = colorFormat
  return color
}

function number(n: Num | Dimension | number, size?: number): number {
  if (n instanceof Dimension) {
    const num = n.nodes[0].value
    if (n.nodes[1].value === '%') {
      if (size !== undefined) {
        return (num * size) / 100
      }
      return num / 100
    }
    return num
  } else if (n instanceof Num) {
    return n.value
  } else if (n.constructor === Number) {
    return n
  } else {
    throw {
      type: 'Argument',
      message: 'Color functions take numbers as parameters'
    }
  }
}

function scaled(n: Num, size: number): number {
  return number(n, size)
}

function hue(h: number, m1: number, m2: number) {
  h = h < 0 ? h + 1 : h > 1 ? h - 1 : h
  if (h * 6 < 1) {
    return m1 + (m2 - m1) * h * 6
  } else if (h * 2 < 1) {
    return m2
  } else if (h * 3 < 2) {
    return m1 + (m2 - m1) * (2 / 3 - h) * 6
  } else {
    return m1
  }
}
colorFunctions = {
  rgb: define(function (r, g, b) {
    return colorFunctions.rgba.call(this, r, g, b, 1)
  }, [Num], [Num], [Num]),

  rgba: define(function (r: Color | Num, g?: Num, b?: Num, a?: Num) {
    const colorFormat = ColorFormat.RGB
    /**
     * e.g. rgba(#fff, 0.5)
     */
    if (r instanceof Color) {
      const rgba = r.value
      if (g) {
        rgba[3] = number(g)
      }
      return new Color(rgba, { colorFormat })
    }

    /**
     * If this wasn't a color, then we require all params
     */
    validateParam(b, 2)
    validateParam(a, 3)

    const rgba = [r, g, b].map(c => scaled(c, 255))
    rgba.push(number(a))
    return new Color(rgba, { colorFormat })
  }, [Color, Num], [Num, undefined], [Num, undefined], [Num, undefined]),

  hsl: define(function (h, s, l) {
    return colorFunctions.hsla.call(this, h, s, l, 1)
  }, [Num], [Num], [Num]),

  hsla: define(function (h: Color | Num, s?: Num, l?: Num, a?: Num) {
    const colorFormat = ColorFormat.HSL
    if (h instanceof Color) {
      const rgba = h.value
      if (s) {
        rgba[3] = number(s)
      }
      return new Color(rgba, { colorFormat })
    }

    validateParam(l, 2)
    validateParam(a, 3)

    let m1: number
    let m2: number

    let hu = (number(h) % 360) / 360
    let sa = clamp(number(s))
    let lu = clamp(number(l))
    let al = clamp(number(a))

    m2 = lu <= 0.5 ? lu * (sa + 1) : lu + sa - lu * sa
    m1 = lu * 2 - m2

    const rgb = [
      hue(hu + 1 / 3, m1, m2) * 255,
      hue(hu, m1, m2) * 255,
      hue(hu - 1 / 3, m1, m2) * 255,
      al
    ]
    return new Color(rgb, { colorFormat })
  }, [Color, Num], [Num, undefined], [Num, undefined], [Num, undefined]),

  hsv: define(function (h, s, v) {
    return colorFunctions.hsva.call(this, h, s, v, 1)
  }, [Num], [Num], [Num]),

  hsva: define(function (h: Num, s: Num, v: Num, a: Num) {
    let hu = ((number(h) % 360) / 360) * 360
    let sa = number(s)
    let va = number(v)

    let i = Math.floor((hu / 60) % 6)
    let f = hu / 60 - i

    const vs = [va, va * (1 - sa), va * (1 - f * sa), va * (1 - (1 - f) * sa)]
    const perm = [
      [0, 3, 1],
      [2, 0, 1],
      [1, 0, 3],
      [1, 2, 0],
      [3, 1, 0],
      [0, 1, 2]
    ]

    return colorFunctions.rgba.call(
      this,
      vs[perm[i][0]] * 255,
      vs[perm[i][1]] * 255,
      vs[perm[i][2]] * 255,
      a
    )
  }, [Num], [Num], [Num], [Num]),

  hue: define(function (color: Color) {
    return new Num(color.toHSL().h)
  }, [Color]),

  saturation: define(function (color: Color) {
    return new Dimension([color.toHSL().s * 100, '%'])
  }, [Color]),

  lightness: define(function (color: Color) {
    return new Dimension([color.toHSL().l * 100, '%'])
  }, [Color]),

  hsvhue: define(function (color: Color) {
    return new Num(color.toHSV().h)
  }, [Color]),

  hsvsaturation: define(function (color: Color) {
    return new Dimension([color.toHSV().s * 100, '%'])
  }, [Color]),

  hsvvalue: define(function (color: Color) {
    return new Dimension([color.toHSV().v * 100, '%'])
  }, [Color]),

  red: define(function (color) {
    return new Num(color.value[0])
  }, [Color]),

  green: define(function (color) {
    return new Num(color.value[1])
  }, [Color]),

  blue: define(function (color: Color) {
    return new Num(color.value[2])
  }, [Color]),

  alpha: define(function (color: Color) {
    return new Num(color.value[3])
  }, [Color]),

  luma: define(function (color: Color) {
    return new Dimension([color.luma() * color.value[3] * 100, '%'])
  }, [Color]),

  luminance: define(function (color: Color) {
    const luminance
      = (0.2126 * color.value[0]) / 255
      + (0.7152 * color.value[1]) / 255
      + (0.0722 * color.value[2]) / 255

    return new Dimension([luminance * color.value[3] * 100, '%'])
  }, [Color]),

  saturate: define(function (color: Color, amount: Num, method?: Node) {
    const hsl = color.toHSL()

    if (method !== undefined && method.value === 'relative') {
      hsl.s += (hsl.s * amount.value) / 100
    } else {
      hsl.s += amount.value / 100
    }
    hsl.s = clamp(hsl.s)
    return hsla.call(this, color, hsl)
  }, [Color], [Num], [Node, undefined]),
  desaturate: define(function (color: Color, amount: Num, method?: Node) {
    const hsl = color.toHSL()

    if (method !== undefined && method.value === 'relative') {
      hsl.s -= (hsl.s * amount.value) / 100
    } else {
      hsl.s -= amount.value / 100
    }
    hsl.s = clamp(hsl.s)
    return hsla.call(this, color, hsl)
  }, [Color], [Num], [Node, undefined]),
  lighten: define(function (color: Color, amount: Num, method?: Node) {
    const hsl = color.toHSL()

    if (method !== undefined && method.value === 'relative') {
      hsl.l += (hsl.l * amount.value) / 100
    } else {
      hsl.l += amount.value / 100
    }
    hsl.l = clamp(hsl.l)
    return hsla.call(this, color, hsl)
  }, [Color], [Num], [Node, undefined]),
  darken: define(function (color: Color, amount: Num, method?: Node) {
    const hsl = color.toHSL()

    if (method !== undefined && method.value === 'relative') {
      hsl.l -= (hsl.l * amount.value) / 100
    } else {
      hsl.l -= amount.value / 100
    }
    hsl.l = clamp(hsl.l)
    return hsla.call(this, color, hsl)
  }, [Color], [Num], [Node, undefined]),
  fadein: define(function (color: Color, amount: Num, method?: Node) {
    const hsl = color.toHSL()

    if (method !== undefined && method.value === 'relative') {
      hsl.a += (hsl.a * amount.value) / 100
    } else {
      hsl.a += amount.value / 100
    }
    hsl.a = clamp(hsl.a)
    return hsla.call(this, color, hsl)
  }, [Color], [Num], [Node, undefined]),
  fadeout: define(function (color: Color, amount: Num, method?: Node) {
    const hsl = color.toHSL()

    if (method !== undefined && method.value === 'relative') {
      hsl.a -= (hsl.a * amount.value) / 100
    } else {
      hsl.a -= amount.value / 100
    }
    hsl.a = clamp(hsl.a)
    return hsla.call(this, color, hsl)
  }, [Color], [Num], [Node, undefined]),
  fade: define(function (color: Color, amount: Num) {
    const hsl = color.toHSL()

    hsl.a = amount.value / 100
    hsl.a = clamp(hsl.a)
    return hsla.call(this, color, hsl)
  }, [Color], [Num]),
  spin: define(function (color: Color, amount: Num) {
    const hsl = color.toHSL()
    const hue = (hsl.h + amount.value) % 360

    hsl.h = hue < 0 ? 360 + hue : hue

    return hsla.call(this, color, hsl)
  }, [Color], [Num]),
  //
  // Copyright (c) 2006-2009 Hampton Catlin, Natalie Weizenbaum, and Chris Eppstein
  // http://sass-lang.com
  //
  mix: define(function (color1: Color, color2: Color, weight?: Num) {
    if (!weight) {
      weight = new Num(50)
    }
    const p = weight.value / 100.0
    const w = p * 2 - 1
    const a = color1.toHSL().a - color2.toHSL().a

    const w1 = ((w * a == -1 ? w : (w + a) / (1 + w * a)) + 1) / 2.0
    const w2 = 1 - w1

    const rgba = [
      color1.value[0] * w1 + color2.value[0] * w2,
      color1.value[1] * w1 + color2.value[1] * w2,
      color1.value[2] * w1 + color2.value[2] * w2,
      color1.value[3] * p + color2.value[3] * (1 - p)
    ]

    return new Color(rgba)
  }, [Color], [Color], [Num, undefined]),

  greyscale: define(function (color: Color) {
    return colorFunctions.desaturate.call(this, color, new Num(100))
  }, [Color]),

  contrast: define(function (color: Color | Num, dark?: Color, light?: Color, threshold?: Num) {
    // filter: contrast(3.2);
    // should be kept as is, so check for color
    if (!(color instanceof Color)) {
      return null
    }
    if (light === undefined) {
      light = colorFunctions.rgba.call(this, 255, 255, 255, 1.0)
    }
    if (dark === undefined) {
      dark = colorFunctions.rgba.call(this, 0, 0, 0, 1.0)
    }
    // Figure out which is actually light and dark:
    if (dark.luma() > light.luma()) {
      const t = light
      light = dark
      dark = t
    }
    let th: number
    if (threshold === undefined) {
      th = 0.43
    } else {
      th = number(threshold)
    }
    if (color.luma() < th) {
      return light
    } else {
      return dark
    }
  }, [Color, Num], [Color, undefined], [Color, undefined], [Num, undefined]),

  argb: define(function (color: Color) {
    return new Value(color.toARGB())
  }, [Color]),

  color: define(function (c: Color | Quoted | Value) {
    if (
      c instanceof Quoted
      && /^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})$/i.test(c.value)
    ) {
      const val = c.value.slice(1)
      return new Color(val, { colorFormat: ColorFormat.HEX })
    }
    if (c instanceof Color) {
      return c
    }
    c = colorFromKeyword(c.value)
    if (!(c instanceof Color)) {
      throw {
        type: 'Argument',
        message: 'Argument must be a color keyword or 3|4|6|8 digit hex e.g. #FFF'
      }
    }
  }, [Color, Quoted, Value]),

  tint: define(function (color: Color, amount: Num) {
    return colorFunctions.mix.call(
      this,
      colorFunctions.rgb.call(this, 255, 255, 255),
      color,
      amount
    )
  }, [Color], [Num]),

  shade: define(function (color: Color, amount: Num) {
    return colorFunctions.mix.call(this, colorFunctions.rgb.call(this, 0, 0, 0), color, amount)
  }, [Color], [Num])
}

export default colorFunctions
