import Node, { NodeArgs } from './node';
import { convertDimension } from './util/convert';
import { operate, fround } from './util/math';

import { Unit, Color } from '.';

type V1Args = [
    value: string | number,
    unit?: string | Node
]
//
// A number with a (optional) unit
//
class Dimension extends Node {
    type: 'Dimension'
    nodes: [number, string]

    constructor(...args: NodeArgs | V1Args) {
        if (Array.isArray(args[0])) {
            super(...(<NodeArgs>args));
            return;
        }
        let [value, unit] = <V1Args>args;
        value = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(value)) {
            throw new Error('Dimension is not a number.');
        }
        unit = (unit && unit instanceof Unit) ? unit.value : unit;

        super([value, unit]);
    }

    get value() {
        return this.nodes[0];
    }

    get unit() {
        return this.nodes[1];
    }

    eval(context) {
        return this;
    }

    toColor() {
        const val = this.nodes[0];
        return new Color([val, val, val]);
    }

    genCSS(context, output) {
        let [value, unit] = this.nodes;
        value = fround(context, value);

        let strValue = String(value);

        if (value !== 0 && value < 0.000001 && value > -0.000001) {
            // would be output 1e-6 etc.
            strValue = value.toFixed(20).replace(/0+$/, '');
        }

        output.add(strValue);
        output.add(unit);
    }

    operate(context, op: string, other: Node): Node {
        const strictUnits = context.options.strictUnits;

        if (!(other instanceof Dimension)) {
            return this;
        }

        const hasUnit = !!other.value[1];

        if (hasUnit) {
            const aUnit = this.nodes[1];
            const bNode = this.unify(other, aUnit);
            const bUnit = bNode.value[1];
    
            if (aUnit !== bUnit) {
                if (strictUnits !== false) {
                    throw new Error(
                        `Incompatible units. Change the units or use the unit function. `
                  + `Bad units: '${aUnit}' and '${bUnit}'.`
                    );
                } else {
                    /**
               * In an operation between two Dimensions,
               * we default to the first Dimension's unit,
               * so `1px + 2%` will yield `3px`.
               *
               * This can have un-intuitive behavior for a user,
               * so it is not a recommended setting.
               */
                    const result = operate(op, this.nodes[0], bNode.value[0]);
                    return new Dimension([result, aUnit], {}).inherit(this);
                }
            } else {
                const result = operate(op, this.nodes[0], bNode.value[0]);
                /** Dividing 8px / 1px will yield 8 */
                if (op === '/') {
                    return new Dimension([result, undefined], {}).inherit(this);
                } else if (op === '*') {
                    throw new Error(`Can't multiply a unit by a unit.`);
                }
                return new Dimension([result, aUnit], {}).inherit(this);
            }
        } else {
            const unit = this.nodes[1];
            const result = operate(op, this.nodes[0], other[0].value);
            return new Dimension([result, unit], {}).inherit(this);
        }
    }
    
    unify(other?: Dimension, unit?: string) {
        other = other || this;
        const newDimension = convertDimension(other, unit);
        if (newDimension) {
            return newDimension;
        }
        return other;
    }

    compare(other: Node) {
        let a: Dimension;
        let b: Dimension;

        if (!(other instanceof Dimension)) {
            return undefined;
        }

        if (this.unit || other.unit) {
            a = this;
            b = other;
        } else {
            a = this.unify();
            b = other.unify();
            if (a.unit !== b.unit) {
                return undefined;
            }
        }

        return Node.numericCompare(a.value[0], b.value[0]);
    }
}

Dimension.prototype.type = 'Dimension';

export default Dimension;
