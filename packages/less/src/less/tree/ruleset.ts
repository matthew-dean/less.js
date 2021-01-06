import Node, { isNodeArgs, NodeArgs, OutputCollector } from './node';
import {
    Declaration,
    Keyword,
    Comment,
    Paren,
    Selector,
    Element,
    Anonymous,
    Import
} from '.';
import globalFunctionRegistry from '../functions/function-registry';
import defaultFunc from '../functions/default';
import getDebugInfo from './debug-info';
import * as utils from '../utils';
import type Visitor from '../visitors/visitor';
import type { Context } from '../contexts';

type V1Args = [
    selectors: Selector[] | string | null,
    rules: Node[],
    strictImports?: boolean
]

/**
 * This currently represents a "Qualified Rule" in CSS.
 * 
 * @todo
 * Split rules into a `Rules` node, so that the nodes
 * array can have a flat Node array of
 *   [List<Selector>, Rules]
 * 
 * @todo
 * The paths should potentially be pulled out and just
 * remain part of the visitor step.
 * 
 * After all todos, this `accept()` method can be removed
 * (inherited from Node).
 */
class Ruleset extends Node {
    _lookups: Record<any, any>;
    _variables: Record<string, Declaration>;
    _properties: Record<string, Declaration[]>;

    /** This is a root node */
    root: boolean;

    /** @todo - make a selector list? */
    selectors: Selector[]
    rules: Node[]

    /** The base ruleset of the tree */
    firstRoot: boolean;

    /** If import nodes will be evaluated if found */
    allowImports: boolean;

    /** 
     * @todo - Find out if this is necessary and document why.
     */
    originalRuleset: Node;

    /**
     * Each ruleset has a registry for JavaScript
     * functions that inherit up the scope chain.
     */
    functionRegistry: typeof globalFunctionRegistry;

    /**
     * @todo - Document.
     * Sum of all selector paths?
     * set by visitor?
     */
    paths: Node[]

    /**
     * @todo - Document
     * Added by Media node
     */
    multiMedia: boolean;

    constructor(...args: NodeArgs | V1Args) {
        if (isNodeArgs(args)) {
            const nodes = args[0];
            if (!nodes.paths) {
                nodes.paths = [];
            }
            super(...args);
        } else {
            let [
                selectors,
                rules,
                strictImports
            ] = args;
            super(
                {
                    selectors,
                    rules: rules || [],
                    paths: []
                },
                { strictImports }
            );
        }

        this._lookups = {};
        this._variables = null;
        this._properties = null;
    }

    isRulesetLike() { return true; }

    /**
     * @todo
     * Can this eval() be simplified or split into multiple files?
     * There's far too much going on here, without documentation.
     */
    eval(context: Context): Ruleset {
        const that = this;
        let selectors;
        let selCnt;
        let selector;
        let i;
        let hasVariable;
        let hasOnePassingSelector = false;

        if (this.selectors && (selCnt = this.selectors.length)) {
            selectors = new Array(selCnt);
            defaultFunc.error({
                type: 'Syntax',
                message: 'it is currently only allowed in parametric mixin guards,'
            });

            for (i = 0; i < selCnt; i++) {
                selector = this.selectors[i].eval(context);
                for (var j = 0; j < selector.elements.length; j++) {
                    if (selector.elements[j].isVariable) {
                        hasVariable = true;
                        break;
                    }
                }
                selectors[i] = selector;
                if (selector.evaldCondition) {
                    hasOnePassingSelector = true;
                }
            }

            if (hasVariable) {
                const toParseSelectors = new Array(selCnt);
                for (i = 0; i < selCnt; i++) {
                    selector = selectors[i];
                    toParseSelectors[i] = selector.toCSS(context);
                }
                this.parse.parseNode(
                    toParseSelectors.join(','),
                    ["selectors"], 
                    selectors[0].getIndex(), 
                    selectors[0].fileInfo, 
                    function(err, result) {
                        if (result) {
                            selectors = utils.flattenArray(result);
                        }
                    });
            }

            defaultFunc.reset();
        } else {
            hasOnePassingSelector = true;
        }

        let rules = this.rules.length ? utils.copyArray(this.rules) : [];
        const ruleset = new Ruleset({ selectors, rules }, this.options).inherit(this);
        let rule;
        let subRule;

        ruleset.originalRuleset = this;
        ruleset.root = this.root;
        ruleset.firstRoot = this.firstRoot;
        ruleset.allowImports = this.allowImports;

        if (this.debugInfo) {
            ruleset.debugInfo = this.debugInfo;
        }

        if (!hasOnePassingSelector) {
            rules.length = 0;
        }

        // inherit a function registry from the frames stack when possible;
        // otherwise from the global registry
        ruleset.functionRegistry = (function (frames) {
            let i = 0;
            const n = frames.length;
            let found;
            for ( ; i !== n ; ++i ) {
                found = frames[i].functionRegistry;
                if ( found ) { return found; }
            }
            return globalFunctionRegistry;
        }(context.frames)).inherit();

        // push the current ruleset to the frames stack
        const ctxFrames = context.frames;
        ctxFrames.unshift(ruleset);

        // currrent selectors
        let ctxSelectors = context.selectors;
        if (!ctxSelectors) {
            context.selectors = ctxSelectors = [];
        }
        ctxSelectors.unshift(this.selectors);

        // Evaluate imports
        if (ruleset.root || ruleset.allowImports || !ruleset.options.strictImports) {
            ruleset.evalImports(context);
        }

        // Store the frames around mixin definitions,
        // so they can be evaluated like closures when the time comes.
        const rsRules = ruleset.rules;
        for (i = 0; (rule = rsRules[i]); i++) {
            if (rule.evalFirst) {
                rsRules[i] = rule.eval(context);
            }
        }

        const mediaBlockCount = (context.mediaBlocks && context.mediaBlocks.length) || 0;

        // Evaluate mixin calls.
        for (i = 0; (rule = rsRules[i]); i++) {
            if (rule.type === 'MixinCall') {
                /* jshint loopfunc:true */
                rules = rule.eval(context).rules.filter(function(r) {
                    if ((r instanceof Declaration) && r.options.isVariable) {
                        // do not pollute the scope if the variable is
                        // already there. consider returning false here
                        // but we need a way to "return" variable from mixins
                        return !(ruleset.variable(r.name));
                    }
                    return true;
                });
                rsRules.splice.apply(rsRules, [i, 1].concat(rules));
                i += rules.length - 1;
                ruleset.resetCache();
            } else if (rule.type ===  'VariableCall') {
                /* jshint loopfunc:true */
                rules = rule.eval(context).rules.filter(function(r) {
                    if ((r instanceof Declaration) && r.options.isVariable) {
                        // do not pollute the scope at all
                        return false;
                    }
                    return true;
                });
                rsRules.splice.apply(rsRules, [i, 1].concat(rules));
                i += rules.length - 1;
                ruleset.resetCache();
            }
        }

        // Evaluate everything else
        for (i = 0; (rule = rsRules[i]); i++) {
            if (!rule.evalFirst) {
                rsRules[i] = rule = rule.eval ? rule.eval(context) : rule;
            }
        }

        // Evaluate everything else
        for (i = 0; (rule = rsRules[i]); i++) {
            // for rulesets, check if it is a css guard and can be removed
            if (rule instanceof Ruleset && rule.selectors && rule.selectors.length === 1) {
                // check if it can be folded in (e.g. & where)
                if (rule.selectors[0] && rule.selectors[0].isJustParentSelector()) {
                    rsRules.splice(i--, 1);

                    for (var j = 0; (subRule = rule.rules[j]); j++) {
                        if (subRule instanceof Node) {
                            subRule.copyVisibilityInfo(rule.visibilityInfo());
                            if (!(subRule instanceof Declaration) || !subRule.options.isVariable) {
                                rsRules.splice(++i, 0, subRule);
                            }
                        }
                    }
                }
            }
        }

        // Pop the stack
        ctxFrames.shift();
        ctxSelectors.shift();

        if (context.mediaBlocks) {
            for (i = mediaBlockCount; i < context.mediaBlocks.length; i++) {
                context.mediaBlocks[i].bubbleSelectors(selectors);
            }
        }

        return ruleset;
    }

    evalImports(context) {
        const rules = this.rules;
        let i;
        let importRules;
        if (!rules.length) { return; }

        for (i = 0; i < rules.length; i++) {
            if (rules[i].type === 'Import') {
                importRules = rules[i].eval(context);
                if (importRules && (importRules.length || importRules.length === 0)) {
                    rules.splice.apply(rules, [i, 1].concat(importRules));
                    i += importRules.length - 1;
                } else {
                    rules.splice(i, 1, importRules);
                }
                this.resetCache();
            }
        }
    }

    makeImportant(): Node {
        const result = new Ruleset(
            {
                selectors: this.selectors,
                rules: this.rules.map(r => r.makeImportant())
            }, {...this.options}
        );

        return result;
    }

    matchArgs(args, context?: Context) {
        return !args || args.length === 0;
    }

    /**
     * Lets you call a css selector with a guard
     *
     * @todo - refactor with mixin definition?
     */
    matchCondition(args, context) {
        const lastSelector = this.selectors[this.selectors.length - 1];
        if (!lastSelector.evaldCondition) {
            return false;
        }
        if (lastSelector.condition &&
            !lastSelector.condition.eval(
                context.create(context.frames)
            )
        ) {
            return false;
        }
        return true;
    }

    /**
     * @todo
     * Is there a way to create a more efficient
     * lookup by type? Could we, for example,
     * store references to a copy of `this.rules`,
     * store a dictionary by type, and then if `this.cachedRules`
     * differs (by reference?), then re-catalog the dictionary?
     * 
     * To do that, we would need to make sure that Nodes do not
     * mutate their props. OR this may be solved by removing
     * leaking variables. (Right now, mixin vars [and mixin names]
     * are spliced directly into rules.)
     * 
     * This is easy to over-engineer but lookup speed is potentially
     * important. It needs test coverage.
     */
    resetCache() {
        this._variables = null;
        this._properties = null;
        this._lookups = {};
    }

    variables() {
        if (!this._variables) {
            this._variables = this.rules.reduce(function (hash, r) {
                if (
                    r instanceof Declaration
                    && r.options.isVariable === true
                    && r.name.constructor === String
                ) {
                    hash[r.name] = r;
                }
                // when evaluating variables in an import statement, imports have not been eval'd
                // so we need to go inside import statements.
                // guard against root being a string (in the case of inlined less)
                if (r instanceof Import && r.root && r.root instanceof Ruleset) {
                    const vars = r.root.variables();
                    for (const name in vars) {
                        if (vars.hasOwnProperty(name)) {
                            hash[name] = r.root.variable(name);
                        }
                    }
                }
                return hash;
            }, {});
        }
        return this._variables;
    }

    properties() {
        if (!this._properties) {
            this._properties = this.rules.reduce(function (hash, r) {
                if (r instanceof Declaration && r.options.isVariable !== true) {
                    const name = r.name;
                    // Properties don't overwrite as they can merge
                    if (!hash[`$${name}`]) {
                        hash[`$${name}`] = [ r ];
                    }
                    else {
                        hash[`$${name}`].push(r);
                    }
                }
                return hash;
            }, {});
        }
        return this._properties;
    }

    variable(name: string) {
        const decl = this.variables()[name];
        /** @todo - remove late parsing */
        if (decl) {
            return this.parseValue(decl);
        }
    }

    property(name: string) {
        const decl = this.properties()[name];
        /** @todo - remove late parsing */
        if (decl) {
            return this.parseValue(decl);
        }
    }

    lastDeclaration() {
        for (let i = this.rules.length; i > 0; i--) {
            const decl = this.rules[i - 1];
            if (decl instanceof Declaration) {
                return this.parseValue(decl);
            }
        }
    }

    /**
     * @note
     * This was added to parse "on-demand" the value of a declaration,
     * but this pattern has a few problems:
     *   1. It isn't good separation of concerns between parsing
     *      and evaluation.
     *   2. It doesn't allow us to actually remove the parser from
     *      a future browser runtime.
     *   3. With an efficient parser and evaluater, it doesn't save
     *      us a lot of time or memory.
     *   4. All those being the case, this adds code / cognitive
     *      overhead to Nodes that do this late parsing.
     * 
     * @deprecated
     */
    parseValue(toParse: Declaration | Declaration[]) {
        const self = this;
        function transformDeclaration(decl: Declaration) {
            if (decl.value instanceof Anonymous && !decl.parsed) {
                if (typeof decl.value.value === 'string') {
                    this.parse.parseNode(
                        decl.value.value,
                        ['value', 'important'], 
                        decl.value.getIndex(), 
                        decl.fileInfo, 
                        function(err, result) {
                            if (err) {
                                decl.parsed = true;
                            }
                            if (result) {
                                decl.value = result[0];
                                decl.important = result[1] || '';
                                decl.parsed = true;
                            }
                        });
                } else {
                    decl.parsed = true;
                }

                return decl;
            }
            else {
                return decl;
            }
        }
        if (!Array.isArray(toParse)) {
            return transformDeclaration.call(self, toParse);
        }
        else {
            const nodes = [];
            toParse.forEach(function(n) {
                nodes.push(transformDeclaration.call(self, n));
            });
            return nodes;
        }
    }

    rulesets() {
        if (!this.rules) { return []; }

        const filtRules = [];
        const rules = this.rules;
        let i;
        let rule;

        for (i = 0; (rule = rules[i]); i++) {
            if (rule instanceof Ruleset) {
                filtRules.push(rule);
            }
        }

        return filtRules;
    }

    prependRule(rule: Node) {
        const rules = this.rules;
        rules.unshift(rule);
    }

    /**
     * Finds matching rules within this ruleset,
     * given a selector.
     * 
     * @todo - Lots to document here and add unit tests
     * 
     * @todo
     * We should speed this up by storing a normalized
     * lookup value.
     */
    find(selector: Selector, self, filter: Function) {
        self = self || this;
        const rules = [];
        let match;
        let foundMixins;
        const key = selector.toCSS();

        if (key in this._lookups) { return this._lookups[key]; }

        this.rulesets().forEach(function (rule) {
            if (rule !== self) {
                for (let j = 0; j < rule.selectors.length; j++) {
                    match = selector.match(rule.selectors[j]);
                    if (match) {
                        if (selector.elements.length > match) {
                            if (!filter || filter(rule)) {
                                foundMixins = rule.find(new Selector(selector.elements.slice(match)), self, filter);
                                for (let i = 0; i < foundMixins.length; ++i) {
                                    foundMixins[i].path.push(rule);
                                }
                                Array.prototype.push.apply(rules, foundMixins);
                            }
                        } else {
                            rules.push({ rule, path: []});
                        }
                        break;
                    }
                }
            }
        });
        this._lookups[key] = rules;
        return rules;
    }

    genCSS(context: Context, output: OutputCollector) {
        const compress = context.options.compress;

        let i;
        let j;
        const charsetRuleNodes = [];
        let ruleNodes = [];

        let // Line number debugging
            debugInfo;

        let rule;
        let path;

        context.tabLevel = (context.tabLevel || 0);

        if (!this.root) {
            context.tabLevel++;
        }

        const tabRuleStr = compress ? '' : Array(context.tabLevel + 1).join('  ');
        const tabSetStr = compress ? '' : Array(context.tabLevel).join('  ');
        let sep;

        let charsetNodeIndex = 0;
        let importNodeIndex = 0;
        for (i = 0; (rule = this.rules[i]); i++) {
            if (rule instanceof Comment) {
                if (importNodeIndex === i) {
                    importNodeIndex++;
                }
                ruleNodes.push(rule);
            } else if (rule.isCharset && rule.isCharset()) {
                ruleNodes.splice(charsetNodeIndex, 0, rule);
                charsetNodeIndex++;
                importNodeIndex++;
            } else if (rule.type === 'Import') {
                ruleNodes.splice(importNodeIndex, 0, rule);
                importNodeIndex++;
            } else {
                ruleNodes.push(rule);
            }
        }
        ruleNodes = charsetRuleNodes.concat(ruleNodes);

        // If this is the root node, we don't render
        // a selector, or {}.
        if (!this.root) {
            debugInfo = getDebugInfo(context, this, tabSetStr);

            if (debugInfo) {
                output.add(debugInfo);
                output.add(tabSetStr);
            }

            const paths = this.paths;
            const pathCnt = paths.length;
            let pathSubCnt;

            sep = compress ? ',' : (`,\n${tabSetStr}`);

            for (i = 0; i < pathCnt; i++) {
                path = paths[i];
                if (!(pathSubCnt = path.length)) { continue; }
                if (i > 0) { output.add(sep); }

                context.firstSelector = true;
                path[0].genCSS(context, output);

                context.firstSelector = false;
                for (j = 1; j < pathSubCnt; j++) {
                    path[j].genCSS(context, output);
                }
            }

            output.add((compress ? '{' : ' {\n') + tabRuleStr);
        }

        // Compile rules and rulesets
        for (i = 0; (rule = ruleNodes[i]); i++) {

            if (i + 1 === ruleNodes.length) {
                context.lastRule = true;
            }

            const currentLastRule = context.lastRule;
            if (rule.isRulesetLike(rule)) {
                context.lastRule = false;
            }

            if (rule.genCSS) {
                rule.genCSS(context, output);
            } else if (rule.value) {
                output.add(rule.value.toString());
            }

            context.lastRule = currentLastRule;

            if (!context.lastRule && rule.isVisible()) {
                output.add(compress ? '' : (`\n${tabRuleStr}`));
            } else {
                context.lastRule = false;
            }
        }

        if (!this.root) {
            output.add((compress ? '}' : `\n${tabSetStr}}`));
            context.tabLevel--;
        }

        if (!output.isEmpty() && !compress && this.firstRoot) {
            output.add('\n');
        }
    }

    /**
     * @todo
     * This should not even be necessary. Instead, the `&` should be a
     * "context lookup"-type node, that searches `context.frames` for
     * the next Ruleset up and then returns those selectors. Selectors,
     * in turn, should have "auto-merging" list / expression strategies.
     * 
     * If done right, we never have to manually "merge" selectors because
     * selectors lists/expressions should merge themselves when eval'd.
     */
    joinSelectors(paths: any[], context: any[], selectors: Selector[]) {
        for (let s = 0; s < selectors.length; s++) {
            this.joinSelector(paths, context, selectors[s]);
        }
    }

    /**
     * @todo - This is far too complex. Rewrite from scratch. 
     */
    joinSelector(paths: any[], context: any[], selector: Selector) {

        function createParenthesis(elementsToPak, originalElement) {
            let replacementParen, j;
            if (elementsToPak.length === 0) {
                replacementParen = new Paren(elementsToPak[0]);
            } else {
                const insideParent = new Array(elementsToPak.length);
                for (j = 0; j < elementsToPak.length; j++) {
                    insideParent[j] = new Element(
                        null,
                        elementsToPak[j],
                        originalElement.isVariable,
                        originalElement._index,
                        originalElement.fileInfo
                    );
                }
                replacementParen = new Paren(new Selector(insideParent));
            }
            return replacementParen;
        }

        function createSelector(containedElement, originalElement) {
            let element, selector;
            element = new Element(null, containedElement, originalElement.isVariable, originalElement._index, originalElement.fileInfo);
            selector = new Selector([element]);
            return selector;
        }

        // joins selector path from `beginningPath` with selector path in `addPath`
        // `replacedElement` contains element that is being replaced by `addPath`
        // returns concatenated path
        function addReplacementIntoPath(beginningPath, addPath, replacedElement, originalSelector) {
            let newSelectorPath, lastSelector, newJoinedSelector;
            // our new selector path
            newSelectorPath = [];

            // construct the joined selector - if & is the first thing this will be empty,
            // if not newJoinedSelector will be the last set of elements in the selector
            if (beginningPath.length > 0) {
                newSelectorPath = utils.copyArray(beginningPath);
                lastSelector = newSelectorPath.pop();
                newJoinedSelector = originalSelector.createDerived(utils.copyArray(lastSelector.elements));
            }
            else {
                newJoinedSelector = originalSelector.createDerived([]);
            }

            if (addPath.length > 0) {
                // /deep/ is a CSS4 selector - (removed, so should deprecate)
                // that is valid without anything in front of it
                // so if the & does not have a combinator that is "" or " " then
                // and there is a combinator on the parent, then grab that.
                // this also allows + a { & .b { .a & { ... though not sure why you would want to do that
                let combinator = replacedElement.combinator;

                const parentEl = addPath[0].elements[0];
                if (combinator.emptyOrWhitespace && !parentEl.combinator.emptyOrWhitespace) {
                    combinator = parentEl.combinator;
                }
                // join the elements so far with the first part of the parent
                newJoinedSelector.elements.push(new Element(
                    combinator,
                    parentEl.value,
                    replacedElement.isVariable,
                    replacedElement._index,
                    replacedElement.fileInfo
                ));
                newJoinedSelector.elements = newJoinedSelector.elements.concat(addPath[0].elements.slice(1));
            }

            // now add the joined selector - but only if it is not empty
            if (newJoinedSelector.elements.length !== 0) {
                newSelectorPath.push(newJoinedSelector);
            }

            // put together the parent selectors after the join (e.g. the rest of the parent)
            if (addPath.length > 1) {
                let restOfPath = addPath.slice(1);
                restOfPath = restOfPath.map(function (selector) {
                    return selector.createDerived(selector.elements, []);
                });
                newSelectorPath = newSelectorPath.concat(restOfPath);
            }
            return newSelectorPath;
        }

        // joins selector path from `beginningPath` with every selector path in `addPaths` array
        // `replacedElement` contains element that is being replaced by `addPath`
        // returns array with all concatenated paths
        function addAllReplacementsIntoPath( beginningPath, addPaths, replacedElement, originalSelector, result) {
            let j;
            for (j = 0; j < beginningPath.length; j++) {
                const newSelectorPath = addReplacementIntoPath(beginningPath[j], addPaths, replacedElement, originalSelector);
                result.push(newSelectorPath);
            }
            return result;
        }

        function mergeElementsOnToSelectors(elements, selectors) {
            let i, sel;

            if (elements.length === 0) {
                return ;
            }
            if (selectors.length === 0) {
                selectors.push([ new Selector(elements) ]);
                return;
            }

            for (i = 0; (sel = selectors[i]); i++) {
                // if the previous thing in sel is a parent this needs to join on to it
                if (sel.length > 0) {
                    sel[sel.length - 1] = sel[sel.length - 1].createDerived(sel[sel.length - 1].elements.concat(elements));
                }
                else {
                    sel.push(new Selector(elements));
                }
            }
        }

        // replace all parent selectors inside `inSelector` by content of `context` array
        // resulting selectors are returned inside `paths` array
        // returns true if `inSelector` contained at least one parent selector
        function replaceParentSelector(paths, context, inSelector) {
            // The paths are [[Selector]]
            // The first list is a list of comma separated selectors
            // The inner list is a list of inheritance separated selectors
            // e.g.
            // .a, .b {
            //   .c {
            //   }
            // }
            // == [[.a] [.c]] [[.b] [.c]]
            //
            let i, j, k, currentElements, newSelectors, selectorsMultiplied, sel, el, hadParentSelector = false, length, lastSelector;
            function findNestedSelector(element) {
                let maybeSelector;
                if (!(element.value instanceof Paren)) {
                    return null;
                }

                maybeSelector = element.value.value;
                if (!(maybeSelector instanceof Selector)) {
                    return null;
                }

                return maybeSelector;
            }

            // the elements from the current selector so far
            currentElements = [];
            // the current list of new selectors to add to the path.
            // We will build it up. We initiate it with one empty selector as we "multiply" the new selectors
            // by the parents
            newSelectors = [
                []
            ];

            for (i = 0; (el = inSelector.elements[i]); i++) {
                // non parent reference elements just get added
                if (el.value !== '&') {
                    const nestedSelector = findNestedSelector(el);
                    if (nestedSelector != null) {
                        // merge the current list of non parent selector elements
                        // on to the current list of selectors to add
                        mergeElementsOnToSelectors(currentElements, newSelectors);

                        const nestedPaths = [];
                        let replaced;
                        const replacedNewSelectors = [];
                        replaced = replaceParentSelector(nestedPaths, context, nestedSelector);
                        hadParentSelector = hadParentSelector || replaced;
                        // the nestedPaths array should have only one member - replaceParentSelector does not multiply selectors
                        for (k = 0; k < nestedPaths.length; k++) {
                            const replacementSelector = createSelector(createParenthesis(nestedPaths[k], el), el);
                            addAllReplacementsIntoPath(newSelectors, [replacementSelector], el, inSelector, replacedNewSelectors);
                        }
                        newSelectors = replacedNewSelectors;
                        currentElements = [];
                    } else {
                        currentElements.push(el);
                    }

                } else {
                    hadParentSelector = true;
                    // the new list of selectors to add
                    selectorsMultiplied = [];

                    // merge the current list of non parent selector elements
                    // on to the current list of selectors to add
                    mergeElementsOnToSelectors(currentElements, newSelectors);

                    // loop through our current selectors
                    for (j = 0; j < newSelectors.length; j++) {
                        sel = newSelectors[j];
                        // if we don't have any parent paths, the & might be in a mixin so that it can be used
                        // whether there are parents or not
                        if (context.length === 0) {
                            // the combinator used on el should now be applied to the next element instead so that
                            // it is not lost
                            if (sel.length > 0) {
                                sel[0].elements.push(new Element(el.combinator, '', el.isVariable, el._index, el.fileInfo));
                            }
                            selectorsMultiplied.push(sel);
                        }
                        else {
                            // and the parent selectors
                            for (k = 0; k < context.length; k++) {
                                // We need to put the current selectors
                                // then join the last selector's elements on to the parents selectors
                                const newSelectorPath = addReplacementIntoPath(sel, context[k], el, inSelector);
                                // add that to our new set of selectors
                                selectorsMultiplied.push(newSelectorPath);
                            }
                        }
                    }

                    // our new selectors has been multiplied, so reset the state
                    newSelectors = selectorsMultiplied;
                    currentElements = [];
                }
            }

            // if we have any elements left over (e.g. .a& .b == .b)
            // add them on to all the current selectors
            mergeElementsOnToSelectors(currentElements, newSelectors);

            for (i = 0; i < newSelectors.length; i++) {
                length = newSelectors[i].length;
                if (length > 0) {
                    paths.push(newSelectors[i]);
                    lastSelector = newSelectors[i][length - 1];
                    newSelectors[i][length - 1] = lastSelector.createDerived(lastSelector.elements, inSelector.extendList);
                }
            }

            return hadParentSelector;
        }

        function deriveSelector(visibilityInfo, deriveFrom) {
            const newSelector = deriveFrom.createDerived(deriveFrom.elements, deriveFrom.extendList, deriveFrom.evaldCondition);
            newSelector.copyVisibilityInfo(visibilityInfo);
            return newSelector;
        }

        // joinSelector code follows
        let i, newPaths, hadParentSelector;

        newPaths = [];
        hadParentSelector = replaceParentSelector(newPaths, context, selector);

        if (!hadParentSelector) {
            if (context.length > 0) {
                newPaths = [];
                for (i = 0; i < context.length; i++) {

                    const concatenated = context[i].map(deriveSelector.bind(this, selector.visibilityInfo()));

                    concatenated.push(selector);
                    newPaths.push(concatenated);
                }
            }
            else {
                newPaths = [[selector]];
            }
        }

        for (i = 0; i < newPaths.length; i++) {
            paths.push(newPaths[i]);
        }

    }
}

Ruleset.prototype.type = 'Ruleset';
Ruleset.prototype.allowRoot = true;

export default Ruleset;
