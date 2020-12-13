import { Context, Node, IProps, ILocationInfo, NumericNode, Num } from '.'

import { fround, operate } from '../util/math'
import { Operator } from '../../constants'

export enum ColorFormat {
  HEX,
  RGB,
  HSL
}

export type IColorOptions = {
  colorFormat?: ColorFormat
}

export type IColorProps = string | number[] | IProps

/**
 * Can be a string?
 */
export class Color extends NumericNode {
  /** RGBA values */
  value: [number, number, number, number]
  options: IColorOptions

  constructor(props: IColorProps, options: IColorOptions = {}, location?: ILocationInfo) {
    if (options.colorFormat === undefined) {
      options.colorFormat = ColorFormat.HEX
    }
    let newProps: IProps
    if (Array.isArray(props)) {
      newProps = <IProps>{ value: props }
    } else if (props.constructor === String) {
      newProps = <IProps>{ text: props }
    } else {
      newProps = <IProps>props
    }

    const { value, text } = newProps

    if (value === undefined && text !== undefined) {
      const newValue: number[] = []

      if (text.charAt(0) !== '#') {
        throw new Error(`Only hex string values can be converted to colors.`)
      }
      const hex = text.slice(1)

      if (hex.length >= 6) {
        (<RegExpMatchArray>hex.match(/.{2}/g)).map((c, i) => {
          if (i < 3) {
            newValue.push(parseInt(c, 16))
          } else {
            newValue.push(parseInt(c, 16) / 255)
          }
        })
      } else {
        hex.split('').map((c, i) => {
          if (i < 3) {
            newValue.push(parseInt(c + c, 16))
          } else {
            newValue.push(parseInt(c + c, 16) / 255)
          }
        })
      }
      /** Make sure an alpha value is present */
      if (newValue.length === 3) {
        newValue.push(1)
      }
      newProps.value = newValue
    }
    super(newProps, options, location)
  }

  luma() {
    let r = this.value[0] / 255
    let g = this.value[1] / 255
    let b = this.value[2] / 255

    r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
    g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
    b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  toString(omitPrePost: boolean = false) {
    let text = this.colorString()
    if (omitPrePost) {
      return text
    }
    return `${this.pre}${text}${this.post}`
  }

  colorString() {
    let color: any
    let args: (string | number)[] = []

    if (this.text) {
      return this.text
    }

    let colorFormat = this.options.colorFormat
    const alpha = fround(this.value[3])
    const rgb = this.value.slice(0, 3)

    if (alpha !== 1 && colorFormat === ColorFormat.HEX) {
      colorFormat = ColorFormat.RGB
    }
    let colorFunction: string | undefined

    switch (colorFormat) {
      case ColorFormat.RGB:
        args = rgb.map(c => this.clamp(Math.round(c), 255))
        if (alpha === 1) {
          colorFunction = 'rgb'
        } else {
          colorFunction = 'rgba'
          args = args.concat(this.clamp(alpha, 1))
        }
        break
      case ColorFormat.HSL:
        color = this.toHSL()
        args = [fround(color.h), `${fround(color.s * 100)}%`, `${fround(color.l * 100)}%`]
        if (alpha === 1) {
          colorFunction = 'hsl'
        } else {
          colorFunction = 'hsla'
          args = args.concat(this.clamp(alpha, 1))
        }
    }

    if (colorFunction) {
      // Values are capped between `0` and `255`, rounded and zero-padded.
      return `${colorFunction}(${args.join(`, `)})`
    }

    return this.toHex(rgb)
  }

  //
  // Operations have to be done per-channel, if not,
  // channels will spill onto each other. Once we have
  // our result, in the form of an integer triplet,
  // we create a new Color node to hold the result.
  //
  operate(op: Operator, other: Node, context?: Context) {
    let otherVal: [number, number, number, number]
    if (other instanceof Num) {
      const val = other.value
      otherVal = [val, val, val, 1]
    } else {
      if (other instanceof Color) {
        otherVal = other.value
      } else {
        return this.error(
          `Incompatible units. An operation can't be between a color and a non-number`,
          context
        )
      }
    }

    const rgba = new Array(4)
    /**
     * @todo - Someone should document why this alpha result is logical for any math op
     *         It seems arbitrary at first glance, but maybe it's the best result?
     */
    const alpha = this.value[3] * (1 - otherVal[3]) + otherVal[3]
    for (let c = 0; c < 3; c++) {
      rgba[c] = operate(op, this.value[c], otherVal[c])
    }
    rgba[3] = alpha
    return new Color({ value: rgba }, { ...this.options }).inherit(this)
  }

  /** Clamp values between 0 and max */
  private clamp(v: number, max: number) {
    return Math.min(Math.max(v, 0), max)
  }

  private hslObject() {
    const value = this.value
    const r = value[0] / 255
    const g = value[1] / 255
    const b = value[2] / 255
    const a = value[3]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)

    return { r, g, b, a, max, min }
  }

  toHSL(): {
    h: number
    s: number
    l: number
    a: number
    } {
    const { r, g, b, a, max, min } = this.hslObject()
    let h: number
    let s: number
    const l = (max + min) / 2
    const d = max - min

    if (max === min) {
      h = s = 0
    } else {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
        default:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }
    return { h: h * 360, s, l, a }
  }

  // Adapted from http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
  toHSV(): {
    h: number
    s: number
    v: number
    a: number
    } {
    const { r, g, b, a, max, min } = this.hslObject()
    let h: number
    let s: number
    const v = max

    const d = max - min
    if (max === 0) {
      s = 0
    } else {
      s = d / max
    }

    if (max === min) {
      h = 0
    } else {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
        default:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }
    return { h: h * 360, s, v, a }
  }

  toHex(v: number[]) {
    return `#${v
      .map(c => {
        c = this.clamp(Math.round(c), 255)
        return (c < 16 ? '0' : '') + c.toString(16)
      })
      .join('')}`
  }

  toARGB() {
    const rgb = [...this.value]
    const alpha: number = <number>rgb.pop()
    return this.toHex([alpha * 255].concat(rgb))
  }
}

Color.prototype.type = 'Color'
