import Node, { IFileInfo, INodeOptions, isNodeArgs, NodeArgs, OutputCollector } from './node';
import type { Context } from '../contexts';
import { List, Anonymous } from '.';
import FunctionCaller from '../functions/function-caller';

type V1Args = [
    name: string,
    args: Node[],
    index?: number,
    currentFileInfo?: IFileInfo
]

//
// A function call node.
//
class Call extends Node {
    type: 'Call'
    options: INodeOptions & {
        calc: boolean
    }
    name: string
    /** @todo - make this a List? */
    args: Node[]

    constructor(...callArgs: V1Args | NodeArgs) {
        if (isNodeArgs(callArgs)) {
            super(...callArgs);
            return;
        }
        const [
            name,
            args,
            index,
            currentFileInfo
        ] = callArgs;
        super(
            { name, args },
            {
                calc: name === 'calc'
            },
            index,
            currentFileInfo
        );
    }

    //
    // When evaluating a function call,
    // we either find the function in the functionRegistry,
    // in which case we call it, passing the evaluated arguments,
    // if this returns null or we cannot find the function, we
    // simply print it out as it appeared originally [2].
    //
    // The reason why we evaluate the arguments, is in the case where
    // we try to pass a variable to a function, like: `saturate(@color)`.
    // The function should receive the value, not the variable.
    //
    eval(context: Context) {
        const isCalc = this.options.calc;
        /**
         * Turn off math for calc(), and switch back on for evaluating nested functions
         */
        const currentMathContext = context.mathOn;
        context.mathOn = !isCalc;
        if (isCalc || context.inCalc) {
            context.enterCalc();
        }

        const exitCalc = () => {
            if (isCalc || context.inCalc) {
                context.exitCalc();
            }
            context.mathOn = currentMathContext;
        };

        let result;
        const funcCaller = new FunctionCaller(this.name, context, this.getIndex(), this.fileInfo);

        if (funcCaller.isValid()) {
            try {
                result = funcCaller.call(this.args);
                exitCalc();
            } catch (e) {
                if (e.hasOwnProperty('line') && e.hasOwnProperty('column')) {
                    throw e;
                }
                throw { 
                    type: e.type || 'Runtime',
                    message: `Error evaluating function \`${this.name}\`${e.message ? `: ${e.message}` : ''}`,
                    index: this.getIndex(), 
                    filename: this.fileInfo.filename,
                    line: e.lineNumber,
                    column: e.columnNumber
                };
            }
        }

        if (result !== null && result !== undefined) {
            // Results that that are not nodes are cast as Anonymous nodes
            // Falsy values or booleans are returned as empty nodes
            if (!(result instanceof Node)) {
                if (!result || result === true) {
                    result = new Anonymous(null); 
                }
                else {
                    result = new Anonymous(result.toString()); 
                }
                
            }
            result._index = this._index;
            result.fileInfo = this.fileInfo;
            return result;
        }

        const args = this.args.map(a => a.eval(context));
        exitCalc();

        return new Call({ name: this.name, args }, this.options, this.location, this.fileInfo);
    }

    genCSS(context: Context, output: OutputCollector) {
        const { name, args } = this;
        output.add(`${name}(`, this.fileInfo, this.getIndex());
        for (let i = 0; i < this.args.length; i++) {
            args[i].genCSS(context, output);
            if (i + 1 < args.length) {
                output.add(', ');
            }
        }
        output.add(')');
    }
}

Call.prototype.type = 'Call';

export default Call;
