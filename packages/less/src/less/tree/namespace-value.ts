import Node, { IFileInfo, INodeOptions, NodeArgs } from './node';
import { Variable, Ruleset, Selector } from '.';
import type { Context } from '../contexts';

type V1Args = [
    nodeCall: Node,
    lookups: string[],
    index?: number,
    fileInfo?: IFileInfo
];

/**
 * @todo
 * Ideally, lookups would not be an array.
 * Instead, this should really be parsed as a
 * nested expression, such that the result can
 * be returned, and evaluated.
 * 
 * In other words, given:
 *    @dr[@one][@two]
 * 
 * This should be parsed as
 *   <NamespaceValue [<NamespaceValue [@dr, @one]>, @two] >
 */
class NamespaceValue extends Node {
    type: 'NamespaceValue'
    nodes: [
        Node,
        string[]
    ]

    constructor(...args: NodeArgs | V1Args) {
        let [
            nodeCall,
            lookups,
            index,
            fileInfo
        ] = args;

        let value = nodeCall
        let options = lookups

        /** v1 args */
        if (Array.isArray(lookups)) {
            value = [nodeCall, lookups]
            options = {}
        }
        super(value, <INodeOptions>options, index, fileInfo);
    }

    get value() {
        return this.nodes[0];
    }
    get lookups() {
        return this.nodes[1];
    }

    /**
     * @todo - We need to clean up return types on mixin / DR calls.
     *         They should always return a ruleset.
     * 
     *         As well, there's too much re-use of vars which isn't
     *         friendly to TypeScript.
     */
    eval(context: Context) {
        let name, rules: any = this.value.eval(context);
        
        for (let i = 0; i < this.lookups.length; i++) {
            name = this.lookups[i];

            /**
             * Eval'd DRs return rulesets.
             * Eval'd mixins return rules, so let's make a ruleset if we need it.
             * We need to do this because of late parsing of values
             */
            if (Array.isArray(rules)) {
                rules = new Ruleset([new Selector(null)], rules);
            }

            /** @note - rules should now be a Ruleset */

            if (name === '') {
                rules = rules.lastDeclaration();
            }
            else if (name.charAt(0) === '@') {
                if (name.charAt(1) === '@') {
                    name = `@${new Variable(name.substr(1)).eval(context).value}`;
                }
                if (rules.variables) {
                    rules = rules.variable(name);
                }
                
                if (!rules) {
                    throw { type: 'Name',
                        message: `variable ${name} not found`,
                        filename: this.fileInfo().filename,
                        index: this.getIndex() };
                }
            }
            else {
                if (name.substring(0, 2) === '$@') {
                    name = `$${new Variable(name.substr(1)).eval(context).value}`;
                }
                else {
                    name = name.charAt(0) === '$' ? name : `$${name}`;
                }
                if (rules.properties) {
                    rules = rules.property(name);
                }

                /** @note - rules should now be a Declaration[] */
            
                if (!rules) {
                    throw { type: 'Name',
                        message: `property "${name.substr(1)}" not found`,
                        filename: this.fileInfo().filename,
                        index: this.getIndex() };
                }
                // Properties are an array of values, since a ruleset can have multiple props.
                // We pick the last one (the "cascaded" value)
                rules = rules[rules.length - 1];
            }

            if (rules.value) {
                rules = rules.eval(context).value;
            }
            if (rules.ruleset) {
                rules = rules.ruleset.eval(context);
            }
        }
        return rules;
    }
}

NamespaceValue.prototype.type = 'NamespaceValue';
export default NamespaceValue;
