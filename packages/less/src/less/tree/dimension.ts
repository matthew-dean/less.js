import Node, { NodeArgs } from './node';
import { convertDimension } from './util/convert';
import { operate } from './util/math';

import Unit from './unit';
import Color from './color';

type V1Args = [
    value: string | number,
    unit: string | Node
]
//
// A number with a (optional) unit
//
class Dimension extends Node {
    type: 'Dimension'
    value: [number, string]

    constructor(...args: V1Args | NodeArgs) {
        if (Array.isArray(args[0])) {
            super(...(<NodeArgs>args));
            return;
        }
        let [value, unit] = <V1Args>args
        value = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(value)) {
            throw new Error('Dimension is not a number.');
        }
        unit = (unit && unit instanceof Unit) ? unit.value : unit

        super([value, unit]);
    }

    get unit() {
        return this.value[1];
    }

    eval(context) {
        return this;
    }

    toColor() {
        const val = this.value[0]
        return new Color([val, val, val]);
    }

    genCSS(context, output) {
        let [value, unit] = this.value;
        if ((context && context.strictUnits) && !unit.isSingular()) {
            throw new Error(`Multiple units in dimension. Correct the units or use the unit function. Bad unit: ${this.unit.toString()}`);
        }

        value = this.fround(context, value);

        let strValue = String(value);

        if (value !== 0 && value < 0.000001 && value > -0.000001) {
            // would be output 1e-6 etc.
            strValue = value.toFixed(20).replace(/0+$/, '');
        }

        if (context && context.compress) {
            // Zero values doesn't need a unit
            if (value === 0 && unit.isLength()) {
                output.add(strValue);
                return;
            }

            // Float values doesn't need a leading zero
            if (value > 0 && value < 1) {
                strValue = (strValue).substr(1);
            }
        }

        output.add(strValue);
        unit.genCSS(context, output);
    }

    operate(context, op: string, other: Node): Node {
        const strictUnits = context.options.strictUnits

        if (other instanceof Dimension) {
          const aUnit = this.value[1]
          const bNode = this.unify(other, aUnit)
          const bUnit = bNode.value[1]
    
          if (aUnit !== bUnit) {
            if (strictUnits !== false) {
              throw new Error(
                `Incompatible units. Change the units or use the unit function. `
                  + `Bad units: '${aUnit}' and '${bUnit}'.`,
              )
            } else {
              /**
               * In an operation between two Dimensions,
               * we default to the first Dimension's unit,
               * so `1px + 2%` will yield `3px`.
               *
               * This can have un-intuitive behavior for a user,
               * so it is not a recommended setting.
               */
              const result = operate(op, this.value[0], bNode.value[0])
              return new Dimension([result, aUnit]).inherit(this)
            }
          } else {
            const result = operate(op, this.value[0], bNode.value[0])
            /** Dividing 8px / 1px will yield 8 */
            if (op === '/') {
              return new Num(result).inherit(this)
            } else if (op === '*') {
              throw new Error(`Can't multiply a unit by a unit.`)
            }
            return new Dimension([result, aUnit.clone()]).inherit(this)
          }
        } else if (other instanceof Num) {
          const unit = this.nodes[1].clone()
          const result = operate(op, this.nodes[0].value, other.value)
          return new Dimension([result, unit.clone()]).inherit(this)
        }
        return this
      }
    
    unify(other: Dimension, unit: string) {
        const newDimension = convertDimension(other, unit)
        if (newDimension) {
            return newDimension
        }
        return other
    }

    compare(other) {
        let a, b;

        if (!(other instanceof Dimension)) {
            return undefined;
        }

        if (this.unit.isEmpty() || other.unit.isEmpty()) {
            a = this;
            b = other;
        } else {
            a = this.unify();
            b = other.unify();
            if (a.unit.compare(b.unit) !== 0) {
                return undefined;
            }
        }

        return Node.numericCompare(a.value, b.value);
    }
}

Dimension.prototype.type = 'Dimension';

export default Dimension;
