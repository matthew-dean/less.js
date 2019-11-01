import { Node } from ".";
import { EvalContext } from "../contexts";

/**
 * The Ampersand ('&')
 */
export class SelectorRef extends Node {
    eval(context: EvalContext) {
        return context.selectors[0].clone().inherit(this);
    }
}
SelectorRef.prototype.type = "SelectorRef";
