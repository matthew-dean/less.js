import Node, { IFileInfo, INodeOptions, NodeArgs } from './node';
import { Variable, Ruleset } from '.';
import type { Context } from '../contexts';
import DetachedRuleset from './detached-ruleset';

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
     */
    eval(context: Context) {
        let result: Node | Node[] = this.value.eval(context);
        
        for (let i = 0; i < this.lookups.length; i++) {
            let name = this.lookups[i];

            /**
             * Eval'd DRs return rulesets.
             * Eval'd mixins return rules, so let's make a ruleset if we need it.
             * We need to do this because of late parsing of values
             * 
             * @todo - Refactor eval of mixins to return rulesets - done?
             */
            if (Array.isArray(result)) {
                result = new Ruleset(null, result);
            }

            /** Now, result is a ruleset */
            if (name === '') {
                result = (<Ruleset>result).lastDeclaration();
            }
            else if (name.charAt(0) === '@') {
                if (name.charAt(1) === '@') {
                    name = `@${new Variable(name.substr(1)).eval(context).value}`;
                }
                if (result instanceof Ruleset) {
                    result = result.variable(name);
                }
                
                if (!result) {
                    throw { type: 'Name',
                        message: `variable ${name} not found`,
                        filename: this.fileInfo().filename,
                        index: this.getIndex() };
                }
            }
            /** This is a property lookup */
            else {
                if (name.substring(0, 2) === '$@') {
                    name = `$${new Variable(name.substr(1)).eval(context).value}`;
                }
                else {
                    name = name.charAt(0) === '$' ? name : `$${name}`;
                }
                if ((<Ruleset>result).properties) {
                    result = (<Ruleset>result).property(name);
                }
                /**
                 * Now, result should be an array of matching declarations
                 */
            
                if (!result) {
                    throw { type: 'Name',
                        message: `property "${name.substr(1)}" not found`,
                        filename: this.fileInfo().filename,
                        index: this.getIndex() };
                }
                // Properties are an array of values, since a ruleset can have multiple props.
                // We pick the last one (the "cascaded" value)
                result = (<Node[]>result)[(<Node[]>result).length - 1];
            }

            /**
             * @todo - Clean up types so these extra checks aren't necessary.
             */

            if (!(Array.isArray(result))) {
                if (result.value) {
                    result = result.eval(context).value;
                }
                if (result instanceof DetachedRuleset) {
                    result = result.ruleset.eval(context);
                }
            }
        }
        /** We should be down to single Node now? */
        return <Node>result;
    }
}

NamespaceValue.prototype.type = 'NamespaceValue';
export default NamespaceValue;
