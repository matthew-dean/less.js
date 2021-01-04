import { Node, Operation, Condition } from '.';
import type { Context } from '../contexts';
import { NodeArgs } from './node';

class Paren extends Node {
    type: 'Paren'
    value: Node

    genCSS(context: Context, output) {
        output.add('(');
        this.value.genCSS(context, output);
        output.add(')');
    }

    eval(context: Context) {
        if (!this.evaluated) {
            let content = this.value;
            let escape = content instanceof Operation || content instanceof Condition;
            context.enterParens();
            const block = super.eval(context);
            context.exitParens();
      
            /**
             * If the result of an operation or compare reduced to a single result,
             * then return the result (remove parens)
             */
            if (escape) {
                let content = block.value;
                if (
                    content
                    && content instanceof Node
                    && (!(content instanceof Operation)
                        && !(content instanceof Condition)
                )) {
                    return content.inherit(this);
                }
            }
            return block;
        }
        return this;
    }
}

Paren.prototype.type = 'Paren';

export default Paren;
