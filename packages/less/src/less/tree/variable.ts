import Node, { IFileInfo, NodeArgs, isNodeArgs } from './node';
import Call from './call';

type V1Args = [
    name: string,
    index?: number,
    currentFileInfo?: IFileInfo
]

class Variable extends Node {
    evaluating: boolean
    nodes: string

    constructor(...args: V1Args | NodeArgs) {
        if (isNodeArgs(args)) {
            super(...args);
            return;
        }
        const [name, index, currentFileInfo] = args;
        super(name, {}, index, currentFileInfo);
    }

    get name() {
        return this.nodes;
    }

    eval(context) {
        let variable, name = this.nodes;

        if (name.indexOf('@@') === 0) {
            name = `@${new Variable(name.slice(1), this.getIndex(), this.fileInfo()).eval(context).value}`;
        }

        if (this.evaluating) {
            throw { type: 'Name',
                message: `Recursive variable definition for ${name}`,
                filename: this.fileInfo().filename,
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
                filename: this.fileInfo().filename,
                index: this.getIndex()
            };
        }
    }

    find(obj, fun) {
        for (let i = 0, r; i < obj.length; i++) {
            r = fun.call(obj, obj[i]);
            if (r) { return r; }
        }
        return null;
    }
}

Variable.prototype.type = 'Variable';

export default Variable;
