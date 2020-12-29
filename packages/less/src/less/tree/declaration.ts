import Node, { IFileInfo, ILocationInfo, INodeOptions, NodeArgs } from './node';
import Value from './list';
import Keyword from './keyword';
import Anonymous from './anonymous';
import * as Constants from '../constants';
const MATH = Constants.Math;

function evalName(context, name) {
    let value = '';
    let i;
    const n = name.length;
    const output = {add: function (s) {value += s;}};
    for (i = 0; i < n; i++) {
        name[i].eval(context).genCSS(context, output);
    }
    return value;
}

type V1Args = [
    name: string | Node[],
    val: string | Node,
    important: string,
    merge: any,
    index: number,
    currentFileInfo: IFileInfo,
    inline: boolean,
    variable: boolean
]

class Declaration extends Node {
    type: 'Declaration'
    value: [Node[] | string, Node | null, string]

    constructor(...args: V1Args | NodeArgs) {
        /** v5 args */
        let [
            value,
            options,
            location,
            fileInfo
        ] = args
        
        /** v1 args */
        if (args[1] instanceof Node || typeof args[1] === 'string') {
            const [
                name,
                val,
                important,
                merge,
                index,
                currentFileInfo,
                inline,
                variable
            ] = <V1Args>args

            value = [
                name,
                (val instanceof Node)
                    ? val
                    : new Value([val ? new Anonymous(val) : null]),
                important ? ` ${important.trim()}` : ''
            ]
            options = {
                merge,
                inline: inline || false,
                variable: (variable !== undefined) ? variable
                    : (!Array.isArray(name) && (name.charAt(0) === '@'))
            }
            location = index
            fileInfo = currentFileInfo
        }
        
        super(value, <INodeOptions>options, <ILocationInfo | number>location, fileInfo);
    }

    get name() {
        return this.value[0]
    }

    get important() {
        return this.value[2]
    }

    genCSS(context, output) {
        output.add(this.name + (context.compress ? ':' : ': '), this.fileInfo(), this.getIndex());
        try {
            this.value[1].genCSS(context, output);
        }
        catch (e) {
            e.index = this._index;
            e.filename = this._fileInfo.filename;
            throw e;
        }
        output.add(this.important + ((this.options.inline || (context.lastRule && context.compress)) ? '' : ';'), this._fileInfo, this._index);
    }

    eval(context) {
        let name = this.value[0],
            evaldValue,
            variable = this.options.variable;

        if (typeof name !== 'string') {
            // expand 'primitive' name directly to get
            // things faster (~10% for benchmark.less):
            if (name.length === 1 && name[0] instanceof Keyword) {
                name = (<Keyword>name[0]).value;
            } else {
                name = evalName(context, name);
            }
            variable = false; // never treat expanded interpolation as new variable name
        }

        try {
            context.importantScope.push({});
            evaldValue = this.value[1].eval(context);

            if (!this.options.variable && evaldValue.type === 'DetachedRuleset') {
                throw { message: 'Rulesets cannot be evaluated on a property.',
                    index: this.getIndex(), filename: this.fileInfo().filename };
            }
            let important = this.important;
            const importantResult = context.importantScope.pop();
            if (!important && importantResult.important) {
                important = importantResult.important;
            }

            return new Declaration(
                [name, evaldValue, important],
                {...this.options, variable },
                this._location,
                this._fileInfo
            );
        }
        catch (e) {
            if (typeof e.index !== 'number') {
                e.index = this.getIndex();
                e.filename = this.fileInfo().filename;
            }
            throw e;
        }
    }

    makeImportant() {
        this.value[2] = ' !important';
    }
}

Declaration.prototype.type = 'Declaration';
Declaration.prototype.allowRoot = true;

export default Declaration;