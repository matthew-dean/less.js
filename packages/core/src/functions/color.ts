import {
  Dimension,
  Num,
  Color,
  Quoted,
  Node,
  Value,
  ColorFormat
} from '../tree/nodes'

import { define, validateParam } from './helpers'
import { Context } from '../tree/context'
import { LessFunction, FunctionError } from '../types'
import { Less } from '..'

let colorFunctions: {
  [key: string]: LessFunction
}

function clamp(val: number) {
  return Math.min(1, Math.max(0, val))
}
function hsla(origColor: Color, hsl) {
  const color = colorFunctions.hsla(hsl.h, hsl.s, hsl.l, hsl.a)
  if (color) {
    if (origColor.value && 
        /^(rgb|hsl)/.test(origColor.value)) {
        color.value = origColor.value;
    } else {
        color.value = 'rgb';
    }
    return color
  }
}
function toHSL(color: Node) {
  if (color.toHSL) {
      return color.toHSL()
  } else {
      throw new Error('Argument cannot be evaluated to a color');
  }
}

function toHSV(color) {
    if (color.toHSV) {
        return color.toHSV();
    } else {
        throw new Error('Argument cannot be evaluated to a color');
    }
}

function number(n) {
    if (n instanceof Dimension) {
        return parseFloat(n.unit.is('%') ? n.value / 100 : n.value);
    } else if (typeof n === 'number') {
        return n;
    } else {
        throw {
            type: 'Argument',
            message: 'color functions take numbers as parameters'
        };
    }
}
function scaled(n, size) {
  if (n instanceof Dimension && n.unit.is('%')) {
    return parseFloat(n.value * size / 100)
  } else {
    return number(n)
  }
}
function hue(h: number, m1: number, m2: number) {
  h = h < 0 ? h + 1 : (h > 1 ? h - 1 : h);
  if (h * 6 < 1) {
    return m1 + (m2 - m1) * h * 6
  }
  else if (h * 2 < 1) {
    return m2
  }
  else if (h * 3 < 2) {
    return m1 + (m2 - m1) * (2 / 3 - h) * 6
  }
  else {
    return m1
  }
}
colorFunctions = {
  rgb: define(function (r, g, b) {
    return colorFunctions.rgba.call(this, r, g, b, 1)
  }, [Num], [Num], [Num]),
  rgba: define(function (r, g, b, a) {
    const colorFormat = ColorFormat.RGB
    /**
     * e.g. rgba(#fff, 0.5)
     */
    if (r instanceof Color) {
      r.options.colorFormat = colorFormat
      if (g) {
        r.value[3] = number(g)
      }
      return r
    }

    /**
     * If this wasn't a color, then we require all params
     */
    validateParam(b, 2)
    validateParam(a, 3)

    const rgb = [r, g, b].map(c => scaled(c, 255))
    rgb.push(number(a))
    return new Color(rgb, { colorFormat })
  }, [Color, Num], [Num, undefined], [Num, undefined], [Num, undefined]),
  hsl: define(function (h, s, l) {
    return colorFunctions.hsla.call(this, h, s, l, 1)
  }, [Num], [Num], [Num]),
  hsla: define(function (h, s, l, a) {
    const colorFormat = ColorFormat.HSL
    if (h instanceof Color) {
      h.options.colorFormat = colorFormat
      if (s) {
        h.value[3] = number(s)
      }
      return h
    }

    validateParam(l, 2)
    validateParam(a, 3)

    let m1: number
    let m2: number

    let hu = (number(h) % 360) / 360
    let sa = clamp(number(s))
    let lu = clamp(number(l))
    let al = clamp(number(a));

    m2 = lu <= 0.5 ? lu * (sa + 1) : lu + sa - lu * sa
    m1 = lu * 2 - m2

    const rgb = [
      hue(hu + 1 / 3, m1, m2) * 255,
      hue(hu, m1, m2)       * 255,
      hue(hu - 1 / 3, m1, m2) * 255,
      al
    ]
    return new Color(rgb, { colorFormat })
  }, [Num], [Num], [Num]),

  hsv: define(function(h, s, v) {
    return colorFunctions.hsva.call(this, h, s, v, 1)
  }, [Num], [Num], [Num]),

  hsva: define(function(h, s, v, a) {
    let hu = ((number(h) % 360) / 360) * 360;
    let sa = number(s)
    let va = number(v)

    let i = Math.floor((hu / 60) % 6)
    let f = (hu / 60) - i

    const vs = [va,
        va * (1 - sa),
        va * (1 - f * sa),
        va * (1 - (1 - f) * sa)]
    const perm = [[0, 3, 1],
        [2, 0, 1],
        [1, 0, 3],
        [1, 2, 0],
        [3, 1, 0],
        [0, 1, 2]]

    return colorFunctions.rgba.call(this, vs[perm[i][0]] * 255,
        vs[perm[i][1]] * 255,
        vs[perm[i][2]] * 255,
        a)
  }, [Num], [Num], [Num], [Num]),

  hue: define(function (color) {
    return new Num(toHSL(color).h)
  }, [Color]),

  saturation: define(function (color) {
    return new Dimension([toHSL(color).s * 100, '%'])
  }, [Color]),

  lightness: define(function (color) {
    return new Dimension([toHSL(color).l * 100, '%'])
  }, [Color]),

  hsvhue: define(function(color) {
    return new Dimension(toHSV(color).h)
  }, [Color]),

  hsvsaturation: define(function (color) {
    return new Dimension([toHSV(color).s * 100, '%'])
  }, [Color]),

  hsvvalue: define(function (color) {
    return new Dimension([toHSV(color).v * 100, '%'])
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
    const luminance =
      (0.2126 * color.value[0] / 255) +
        (0.7152 * color.value[1] / 255) +
        (0.0722 * color.value[2] / 255)

    return new Dimension([luminance * color.value[3] * 100, '%'])
  }, [Color]),
  saturate: define(function (color: Color, amount: Num, method?: Node) {
    const hsl = toHSL(color)

    if (method !== undefined && method.value === 'relative') {
      hsl.s +=  hsl.s * amount.value / 100
    }
    else {
      hsl.s += amount.value / 100
    }
    hsl.s = clamp(hsl.s)
    return hsla(color, hsl)
  }, [Color], [Num], [Node, undefined]),
  desaturate: define(function (color: Color, amount: Num, method?: Node) {
    const hsl = toHSL(color)

    if (method !== undefined && method.value === 'relative') {
      hsl.s -=  hsl.s * amount.value / 100
    }
    else {
      hsl.s -= amount.value / 100
    }
    hsl.s = clamp(hsl.s)
    return hsla(color, hsl)
  }, [Color], [Num], [Node, undefined]),
  lighten: function (color: Color, amount: Num, method?: Node) {
    const hsl = toHSL(color)

    if (method !== undefined && method.value === 'relative') {
      hsl.l +=  hsl.l * amount.value / 100
    }
    else {
      hsl.l += amount.value / 100
    }
    hsl.l = clamp(hsl.l)
    return hsla(color, hsl)
  },
  darken: function (color: Color, amount: Num, method?: Node) {
    const hsl = toHSL(color)

    if (method !== undefined && method.value === 'relative') {
      hsl.l -=  hsl.l * amount.value / 100
    }
    else {
      hsl.l -= amount.value / 100
    }
    hsl.l = clamp(hsl.l)
    return hsla(color, hsl)
  },
  fadein: function (color, amount, method) {
      const hsl = toHSL(color);

      if (typeof method !== 'undefined' && method.value === 'relative') {
          hsl.a +=  hsl.a * amount.value / 100;
      }
      else {
          hsl.a += amount.value / 100;
      }
      hsl.a = clamp(hsl.a);
      return hsla(color, hsl);
  },
  fadeout: function (color, amount, method) {
      const hsl = toHSL(color);

      if (typeof method !== 'undefined' && method.value === 'relative') {
          hsl.a -=  hsl.a * amount.value / 100;
      }
      else {
          hsl.a -= amount.value / 100;
      }
      hsl.a = clamp(hsl.a);
      return hsla(color, hsl);
  },
  fade: function (color, amount) {
      const hsl = toHSL(color);

      hsl.a = amount.value / 100;
      hsl.a = clamp(hsl.a);
      return hsla(color, hsl);
  },
  spin: function (color, amount) {
      const hsl = toHSL(color);
      const hue = (hsl.h + amount.value) % 360;

      hsl.h = hue < 0 ? 360 + hue : hue;

      return hsla(color, hsl);
  },
  //
  // Copyright (c) 2006-2009 Hampton Catlin, Natalie Weizenbaum, and Chris Eppstein
  // http://sass-lang.com
  //
  mix: function (color1, color2, weight) {
      if (!weight) {
          weight = new Dimension(50);
      }
      const p = weight.value / 100.0;
      const w = p * 2 - 1;
      const a = toHSL(color1).a - toHSL(color2).a;

      const w1 = (((w * a == -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
      const w2 = 1 - w1;

      const rgb = [color1.rgb[0] * w1 + color2.rgb[0] * w2,
          color1.rgb[1] * w1 + color2.rgb[1] * w2,
          color1.rgb[2] * w1 + color2.rgb[2] * w2];

      const alpha = color1.alpha * p + color2.alpha * (1 - p);

      return new Color(rgb, alpha);
  },
  greyscale: function (color) {
      return colorFunctions.desaturate(color, new Dimension(100));
  },
  contrast: function (color, dark, light, threshold) {
      // filter: contrast(3.2);
      // should be kept as is, so check for color
      if (!color.rgb) {
          return null;
      }
      if (typeof light === 'undefined') {
          light = colorFunctions.rgba(255, 255, 255, 1.0);
      }
      if (typeof dark === 'undefined') {
          dark = colorFunctions.rgba(0, 0, 0, 1.0);
      }
      // Figure out which is actually light and dark:
      if (dark.luma() > light.luma()) {
          const t = light;
          light = dark;
          dark = t;
      }
      if (typeof threshold === 'undefined') {
          threshold = 0.43;
      } else {
          threshold = number(threshold);
      }
      if (color.luma() < threshold) {
          return light;
      } else {
          return dark;
      }
  },
  
  argb: function (color) {
      return new Anonymous(color.toARGB());
  },
  color: function(c) {
      if ((c instanceof Quoted) &&
          (/^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})$/i.test(c.value))) {
          const val = c.value.slice(1);
          return new Color(val, undefined, `#${val}`);
      }
      if ((c instanceof Color) || (c = Color.fromKeyword(c.value))) {
          c.value = undefined;
          return c;
      }
      throw {
          type:    'Argument',
          message: 'argument must be a color keyword or 3|4|6|8 digit hex e.g. #FFF'
      };
  },
  tint: function(color, amount) {
      return colorFunctions.mix(colorFunctions.rgb(255, 255, 255), color, amount);
  },
  shade: function(color, amount) {
      return colorFunctions.mix(colorFunctions.rgb(0, 0, 0), color, amount);
  }
}

export default colorFunctions;
