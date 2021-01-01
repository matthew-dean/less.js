import Node, { IFileInfo, NodeArgs, isNodeArgs, OutputCollector } from './node';
import { Variable, Property } from '.';
import type { Context } from '../contexts';

type V1Args = [
    quote: string,
    content: string, // contents of the string (between quote marks)
    escaped?: boolean,
    index?: number,
    fileInfo?: IFileInfo
];

class Quoted extends Node {
    type: 'Quoted';
    variableRegex: RegExp;
    propRegex: RegExp;

    options: {
        quote: string;
        escaped: boolean;
    };
    nodes: string;

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            const [
                value,
                options,
                location,
                fileInfo
            ] = args;
            super(value, options, location, fileInfo);
            this.allowRoot = <boolean>(options.escaped);
            return;
        }
        let [
            quote,
            content,
            escaped,
            index,
            fileInfo
        ] = args;

        escaped = !!escaped;
        super(
            content,
            { escaped, quote },
            index,
            fileInfo
        );
        this.allowRoot = escaped;
    }

    get value() {
        return this.nodes
    }

    genCSS(context: Context, output: OutputCollector) {
        const { quote, escaped } = this.options;
        if (!escaped) {
            output.add(quote, this.fileInfo(), this.getIndex());
        }
        output.add(this.value);
        if (!escaped) {
            output.add(quote);
        }
    }

    containsVariables() {
        return this.value.match(this.variableRegex);
    }

    eval(context: Context) {
        let value = this.value;
        const { quote, escaped } = this.options;
        const variableReplacement = (_, name) => {
            const v = new Variable(`@${name}`, this.getIndex(), this.fileInfo()).eval(context);
            return (v instanceof Quoted) ? v.value : v.toCSS();
        };
        const propertyReplacement = (_, name) => {
            const v = new Property(`$${name}`, this.getIndex(), this.fileInfo()).eval(context);
            return (v instanceof Quoted) ? v.value : v.toCSS();
        };
        function iterativeReplace(
            value: string,
            regexp: RegExp,
            replacementFnc: (substring: string, ...args: any[]) => string
        ) {
            let evaluatedValue = value;
            do {
                value = evaluatedValue.toString();
                evaluatedValue = value.replace(regexp, replacementFnc);
            } while (value !== evaluatedValue);
            return evaluatedValue;
        }
        value = iterativeReplace(value, this.variableRegex, variableReplacement);
        value = iterativeReplace(value, this.propRegex, propertyReplacement);
        return new Quoted(value, { quote, escaped }, this.getIndex(), this.fileInfo());
    }

    compare(other: Node) {
        // when comparing quoted strings allow the quote to differ
        if (other instanceof Quoted && !this.options.escaped && !other.options.escaped) {
            return Node.numericCompare(this.value, other.value);
        } else {
            return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
        }
    }
}

/**
 * @todo
 * Is there a way to use context-sensitive parsing to
 * parse interpolated vars / props / expressions within
 * a quote?
 * 
 * @note
 * These props are over-ridden in the historical parser
 */
Quoted.prototype.variableRegex = /@\{([\w-]+)\}/g;
Quoted.prototype.propRegex = /\$\{([\w-]+)\}/g;
Quoted.prototype.type = 'Quoted';

export default Quoted;
