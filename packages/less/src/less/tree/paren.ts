import { Node, Operation, Condition } from '.';
import type { Context } from '../contexts';
import Expression from './expression';

/**
 * An expression / node in parentheses
 * 
 * @todo - This is used in selectors where it doesn't need to be
 */
class Paren extends Node {
    type: 'Paren'
    value: Node

    genCSS(context: Context, output) {
        output.add('(');
        this.value.genCSS(context, output);
        output.add(')');
    }

    eval(context: Context): Node {
        if (!this.evaluated) {
            let content = this.value;
            let escape = content instanceof Operation
                || content instanceof Expression
                || content instanceof Operation
            
            context.enterParens();
            const paren = <Paren>super.eval(context);
            context.exitParens();
      
            /**
             * If the result of an eval can be reduced to a single result,
             * then return the result (remove parens)
             */
            content = paren.value;
            if (content && content instanceof Node) {
                /** Remove double parens */
                if (content instanceof Paren) {
                    return content.inherit(this);
                } else if (
                    escape
                    && (
                        !(content instanceof Operation)
                        && !(content instanceof Condition)
                        && !(content instanceof Expression)
                    )
                ) {
                    return content.inherit(this);
                }
            }
            return paren;
        }
        return this;
    }
}

Paren.prototype.type = 'Paren';

export default Paren;
