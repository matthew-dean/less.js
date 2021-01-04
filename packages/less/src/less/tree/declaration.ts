import Node, {
    IFileInfo,
    ILocationInfo,
    INodeOptions,
    NodeArgs,
    NodeCollection,
    OutputCollector
} from './node';
import type { Context } from '../contexts';

import { List, Keyword, Anonymous } from '.';
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
    property: string | Node[],
    value: string | Node,
    important?: string,
    merge?: any,
    index?: number,
    currentFileInfo?: IFileInfo,
    inline?: boolean,
    variable?: boolean
]

type DeclarationOptions = {
    merge?: string | boolean
    inline?: boolean
    isVariable?: boolean
}

class Declaration extends Node {
    type: 'Declaration'
    property: Node[] | string
    value: Node | null
    important: string
    options: DeclarationOptions

    /** @deprecated */
    parsed: boolean

    constructor(...args: V1Args | NodeArgs) {
        /** v5 args */
        let [
            nodes,
            options,
            location,
            fileInfo
        ] = args;
        
        /** v1 args */
        if (args[1] instanceof Node || typeof args[1] === 'string') {
            const [
                property,
                val,
                important,
                merge,
                index,
                currentFileInfo,
                inline,
                variable
            ] = <V1Args>args;

            nodes = {
                property,
                value: (val instanceof Node)
                    ? val
                    : new List([val ? new Anonymous(val) : null]),
                important: important ? ` ${important.trim()}` : ''
            };
            options = {
                merge,
                inline: inline || false,
                isVariable: (variable !== undefined) ? variable
                    : (!Array.isArray(property) && (property.charAt(0) === '@'))
            };
            location = index;
            fileInfo = currentFileInfo;
        }
        
        super(
            <NodeCollection>nodes,
            <INodeOptions>options,
            <ILocationInfo | number>location,
            fileInfo
        );
    }

    get name() {
        let name = this.property;
        if (Array.isArray(name)) {
            return <string>name[0].value;
        }
        return name;
    }

    blocksVisibility() {
        return this.options.isVariable;
    }

    genCSS(context: Context, output: OutputCollector) {
        const compress = context.options.compress;
        output.add(this.name + (compress ? ':' : ': '), this.fileInfo(), this.getIndex());
        try {
            this.value.genCSS(context, output);
        }
        catch (e) {
            e.index = this._index;
            e.filename = this._fileInfo.filename;
            throw e;
        }
        output.add(this.important + ((this.options.inline || (context.lastRule && compress)) ? '' : ';'), this._fileInfo, this._index);
    }

    eval(context: Context) {
        let property = this.property;
        let isVariable = this.options.isVariable;

        if (Array.isArray(property)) {
            // expand 'primitive' name directly to get
            // things faster (~10% for benchmark.less):
            if (property.length === 1 && property[0] instanceof Keyword) {
                property = (<Keyword>property[0]).value;
            } else {
                property = evalName(context, property);
            }
            isVariable = false; // never treat expanded interpolation as new variable name
        }

        try {
            context.importantScope.push({});
            const evaldValue = this.value.eval(context);

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
                { property, value: evaldValue, important },
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

    /** 
     * @note
     * This created a new node in the past. Should nodes never mutate?
    */
    makeImportant() {
        this.important = ' !important';
        return this;
    }
}

Declaration.prototype.type = 'Declaration';
Declaration.prototype.allowRoot = true;

export default Declaration;