import {
    Anonymous,
    Bool
} from '../tree';
import Keyword from '../tree/keyword';

function boolean(condition) {
    return condition ? new Bool(true) : new Bool(false);
}

/**
 * Functions with evalArgs set to false are sent context
 * as the first argument.
 */
function If(context, condition, trueValue, falseValue) {
    return condition.eval(context) ? trueValue.eval(context)
        : (falseValue ? falseValue.eval(context) : new Anonymous);
}
If.evalArgs = false;

function isdefined(context, variable) {
    try {
        variable.eval(context);
        return new Bool(true);
    } catch (e) {
        return new Bool(false);
    }
}

isdefined.evalArgs = false;

export default { isdefined, boolean, 'if': If };
