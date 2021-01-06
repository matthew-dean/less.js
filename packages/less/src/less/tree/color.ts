import Node, { isNodeArgs, NodeArgs, OutputCollector } from './node';
import type { Context } from '../contexts';
import colors from '../data/colors';
import { fround } from './util/math';

type V1Args = [
    rgb: string | number[],
    alpha?: number,
    originalValue?: string
]

//
// RGB Colors - #ff0014, #eee
//              rgba(0, 0, 0, 0)
//
class Color extends Node {
    type: 'Color'
    rgb: number[]
    alpha: number
    value: string

    constructor(...args: NodeArgs | V1Args) {
        let [
            rgb,
            alpha,
            value,
            fileInfo
        ] = args;

        let options, location;
        
        /** v5 API */
        if (isNodeArgs(args)) {
            /** The first arg is the entire value */
            options = alpha;
            location = value;
            rgb = rgb['rgb'];
            alpha = rgb['alpha'];
            value = rgb['value'];
        } else {
            fileInfo = undefined;
        }

        let rgbArray: number[];
        //
        // The end goal here, is to parse the arguments
        // into an integer triplet, such as `128, 255, 0`
        //
        // This facilitates operations and conversions.
        //
        if (Array.isArray(rgb)) {
            rgbArray = rgb;
        } else if ((<string>rgb).length >= 6) {
            rgbArray = [];
            (<string>rgb).match(/.{2}/g).map((c, i) => {
                if (i < 3) {
                    rgbArray.push(parseInt(c, 16));
                } else {
                    alpha = (parseInt(c, 16)) / 255;
                }
            });
        } else {
            rgbArray = [];
            (<string>rgb).split('').map((c, i) => {
                if (i < 3) {
                    rgbArray.push(parseInt(c + c, 16));
                } else {
                    alpha = (parseInt(c + c, 16)) / 255;
                }
            });
        }
        alpha = alpha || (typeof alpha === 'number' ? alpha : 1);
        super(
            { rgb: rgbArray, alpha: <number>alpha, value: <string>value },
            options,
            location,
            fileInfo
        );
    }

    luma() {
        const rgb = this.rgb;
        let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;

        r = (r <= 0.03928) ? r / 12.92 : Math.pow(((r + 0.055) / 1.055), 2.4);
        g = (g <= 0.03928) ? g / 12.92 : Math.pow(((g + 0.055) / 1.055), 2.4);
        b = (b <= 0.03928) ? b / 12.92 : Math.pow(((b + 0.055) / 1.055), 2.4);

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    genCSS(context: Context, output: OutputCollector) {
        output.add(this.toCSS(context));
    }

    toCSS(context: Context, doNotCompress?) {
        const compress = context && context.options.compress && !doNotCompress;
        let color;
        let colorFunction;
        let args = [];

        let {
            rgb,
            alpha,
            value
         } = this;

        // `value` is set if this color was originally
        // converted from a named color string so we need
        // to respect this and try to output named color too.
        alpha = fround(alpha);

        if (value) {
            if (value.indexOf('rgb') === 0) {
                if (alpha < 1) {
                    colorFunction = 'rgba';
                }
            } else if (value.indexOf('hsl') === 0) {
                if (alpha < 1) {
                    colorFunction = 'hsla';
                } else {
                    colorFunction = 'hsl';
                }
            } else {
                return value;
            }
        } else {
            if (alpha < 1) {
                colorFunction = 'rgba';
            }
        }

        switch (colorFunction) {
            case 'rgba':
                args = rgb.map(function (c) {
                    return clamp(Math.round(c), 255);
                }).concat(clamp(alpha, 1));
                break;
            case 'hsla':
                args.push(clamp(alpha, 1));
            case 'hsl':
                color = this.toHSL();
                args = [
                    fround(color.h),
                    `${fround(color.s * 100)}%`,
                    `${fround(color.l * 100)}%`
                ].concat(args);
        }

        if (colorFunction) {
            // Values are capped between `0` and `255`, rounded and zero-padded.
            return `${colorFunction}(${args.join(`,${compress ? '' : ' '}`)})`;
        }

        color = this.toRGB();

        if (compress) {
            const splitcolor = color.split('');

            // Convert color to short format
            if (splitcolor[1] === splitcolor[2] && splitcolor[3] === splitcolor[4] && splitcolor[5] === splitcolor[6]) {
                color = `#${splitcolor[1]}${splitcolor[3]}${splitcolor[5]}`;
            }
        }

        return color;
    }

    //
    // Operations have to be done per-channel, if not,
    // channels will spill onto each other. Once we have
    // our result, in the form of an integer triplet,
    // we create a new Color node to hold the result.
    //
    operate(context: Context, op: string, other: Color) {
        let {
            rgb,
            alpha
        } = this;

        const newRGB = new Array(3);
        alpha = alpha * (1 - other.alpha) + other.alpha;
        for (let c = 0; c < 3; c++) {
            newRGB[c] = this._operate(context, op, rgb[c], other.rgb[c]);
        }
        return new Color(newRGB, alpha);
    }

    toRGB() {
        return toHex(this.rgb);
    }

    toHSL() {
        const { rgb, alpha } = this;
        const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, a = alpha;

        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h;
        let s;
        const l = (max + min) / 2;
        const d = max - min;

        if (max === min) {
            h = s = 0;
        } else {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2;               break;
                case b: h = (r - g) / d + 4;               break;
            }
            h /= 6;
        }
        return { h: h * 360, s, l, a };
    }

    // Adapted from http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    toHSV() {
        const { rgb, alpha } = this;
        const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, a = alpha;

        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h;
        let s;
        const v = max;

        const d = max - min;
        if (max === 0) {
            s = 0;
        } else {
            s = d / max;
        }

        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s, v, a };
    }

    toARGB() {
        return toHex([this.alpha * 255].concat(this.rgb));
    }

    compare(x) {
        const { rgb, alpha } = this;
        return (x.rgb &&
            x.rgb[0] === rgb[0] &&
            x.rgb[1] === rgb[1] &&
            x.rgb[2] === rgb[2] &&
            x.alpha  === alpha) ? 0 : undefined;
    }

    static fromKeyword(keyword) {
        let c: Color;
        const key = keyword.toLowerCase();
        if (colors.hasOwnProperty(key)) {
            c = new Color(colors[key].slice(1));
        }
        else if (key === 'transparent') {
            c = new Color([0, 0, 0], 0);
        }
    
        if (c) {
            c.value = keyword;
            return c;
        }
    }
}

function clamp(v, max) {
    return Math.min(Math.max(v, 0), max);
}

function toHex(v) {
    return `#${v.map(function (c) {
        c = clamp(Math.round(c), 255);
        return (c < 16 ? '0' : '') + c.toString(16);
    }).join('')}`;
}

Color.prototype.type = 'Color';

export default Color;
