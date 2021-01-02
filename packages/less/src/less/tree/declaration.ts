import Node, {
    IFileInfo,
    ILocationInfo,
    INodeOptions,
    NodeArgs,
    OutputCollector
} from './node';
import type { Context } from '../contexts';

import { List, Keyword, Anonymous } from '.';
import * as Constants from '../constants';
import Condition from './condition';
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
    important?: string,
    merge?: any,
    index?: number,
    currentFileInfo?: IFileInfo,
    inline?: boolean,
    variable?: boolean
]

type DeclarationOptions = {
    merge?: boolean
    inline?: boolean
    isVariable?: boolean
}

class Declaration extends Node {
    type: 'Declaration'
    nodes: [Node[] | string, Node | null, string]
    options: DeclarationOptions

    /** @deprecated */
    parsed: boolean

    constructor(...args: V1Args | NodeArgs) {
        /** v5 args */
        let [
            value,
            options,
            location,
            fileInfo
        ] = args;
        
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
            ] = <V1Args>args;

            value = [
                name,
                (val instanceof Node)
                    ? val
                    : new List([val ? new Anonymous(val) : null]),
                important ? ` ${important.trim()}` : ''
            ];
            options = {
                merge,
                inline: inline || false,
                isVariable: (variable !== undefined) ? variable
                    : (!Array.isArray(name) && (name.charAt(0) === '@'))
            };
            location = index;
            fileInfo = currentFileInfo;
        }
        
        super(value, <INodeOptions>options, <ILocationInfo | number>location, fileInfo);
    }

    get name(): string {
        let name = this.nodes[0];
        if (Array.isArray(name)) {
            return name[0].value;
        }
        return name;
    }
    get value() {
        return this.nodes[1];
    }
    set value(n: Node) {
        this.nodes[1] = n;
    }
    get important() {
        return this.nodes[2];
    }
    set important(str: string) {
        this.nodes[2] = str;
    }

    blocksVisibility() {
        return this.options.isVariable;
    }

    genCSS(context: Context, output: OutputCollector) {
        const compress = context.options.compress;
        output.add(this.name + (compress ? ':' : ': '), this.fileInfo(), this.getIndex());
        try {
            this.nodes[1].genCSS(context, output);
        }
        catch (e) {
            e.index = this._index;
            e.filename = this._fileInfo.filename;
            throw e;
        }
        output.add(this.important + ((this.options.inline || (context.lastRule && compress)) ? '' : ';'), this._fileInfo, this._index);
    }

    eval(context: Context) {
        let name = this.nodes[0];
        let isVariable = this.options.isVariable;

        if (typeof name !== 'string') {
            // expand 'primitive' name directly to get
            // things faster (~10% for benchmark.less):
            if (name.length === 1 && name[0] instanceof Keyword) {
                name = (<Keyword>name[0]).value;
            } else {
                name = evalName(context, name);
            }
            isVariable = false; // never treat expanded interpolation as new variable name
        }

        try {
            context.importantScope.push({});
            const evaldValue = this.nodes[1].eval(context);

            if (!this.options.isVariable && evaldValue.type === 'DetachedRuleset') {
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
                {...this.options, isVariable },
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
        this.nodes[2] = ' !important';
        return this;
    }
}

Declaration.prototype.type = 'Declaration';
Declaration.prototype.allowRoot = true;

export default Declaration;