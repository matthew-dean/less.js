import { Node, Operation, Condition } from '.';
import type { Context } from '../contexts';
import Expression from './expression';
import { NodeArgs } from './node';

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
            context.enterParens();
            super.eval(context);
            context.exitParens();
      
            /**
             * If the result of an eval can be reduced to a single result,
             * then return the result (remove parens)
             */
            content = this.value;
            if (
                content
                && content instanceof Node
                && (
                    !(content instanceof Operation)
                    && !(content instanceof Condition)
                    && !(content instanceof Expression)
                )
            ) {
                return content.inherit(this);
            }
        }
        return this;
    }
}

Paren.prototype.type = 'Paren';

export default Paren;
