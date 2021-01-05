import Node, { IFileInfo, NodeArgs, isNodeArgs } from './node';
import { Call, Ruleset } from '.';
import type { Context } from '../contexts';

type V1Args = [
    name: string,
    index?: number,
    currentFileInfo?: IFileInfo
]

class Variable extends Node {
    evaluating: boolean
    value: string

    constructor(...args: V1Args | NodeArgs) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }
        const [value, index, currentFileInfo] = args;
        super({ value }, {}, index, currentFileInfo);
    }

    get name() {
        return this.value;
    }

    eval(context: Context) {
        let variable, name = this.name;

        if (name.indexOf('@@') === 0) {
            name = `@${new Variable(name.slice(1), this.getIndex(), this.fileInfo).eval(context).value}`;
        }

        if (this.evaluating) {
            throw { type: 'Name',
                message: `Recursive variable definition for ${name}`,
                filename: this.fileInfo.filename,
                index: this.getIndex() };
        }

        this.evaluating = true;

        variable = this.find(context.frames, function (frame) {
            const v = frame.variable(name);
            if (v) {
                if (v.important) {
                    const importantScope = context.importantScope[context.importantScope.length - 1];
                    importantScope.important = v.important;
                }
                // If in calc, wrap vars in a function call to cascade evaluate args first
                if (context.inCalc) {
                    return (new Call('_SELF', [v.value])).eval(context);
                }
                else {
                    return v.value.eval(context);
                }
            }
        });
        if (variable) {
            this.evaluating = false;
            return variable;
        } else {
            throw { type: 'Name',
                message: `variable ${name} is undefined`,
                filename: this.fileInfo.filename,
                index: this.getIndex()
            };
        }
    }

    find(frames: Ruleset[], fun: (r: Ruleset) => Node) {
        for (let i = 0, r; i < frames.length; i++) {
            r = fun.call(frames, frames[i]);
            if (r) { return r; }
        }
        return null;
    }
}

Variable.prototype.type = 'Variable';

export default Variable;
