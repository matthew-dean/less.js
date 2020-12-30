import * as Constants from './constants';
import type Node from './tree/node'

const {
    ALWAYS,
    PARENS_DIVISION
} = Constants.Math

const { LOCAL } = Constants.RewriteUrls

const contexts: {
    Parse?: Function
    Eval?: Function
} = {};

const copyFromOriginal = function copyFromOriginal(original, destination, propertiesToCopy) {
    if (!original) { return; }

    for (let i = 0; i < propertiesToCopy.length; i++) {
        if (original.hasOwnProperty(propertiesToCopy[i])) {
            destination[propertiesToCopy[i]] = original[propertiesToCopy[i]];
        }
    }
};

/*
 parse is used whilst parsing
 */
const parseCopyProperties = [
    // options
    'paths',            // option - unmodified - paths to search for imports on
    'rewriteUrls',      // option - whether to adjust URL's to be relative
    'rootpath',         // option - rootpath to append to URL's
    'strictImports',    // option -
    'insecure',         // option - whether to allow imports from insecure ssl hosts
    'dumpLineNumbers',  // option - whether to dump line numbers
    'compress',         // option - whether to compress
    'syncImport',       // option - whether to import synchronously
    'chunkInput',       // option - whether to chunk input. more performant but causes parse issues.
    'mime',             // browser only - mime type for sheet import
    'useFileCache',     // browser only - whether to use the per file session cache
    // context
    'processImports',   // option & context - whether to process imports. if false then imports will not be imported.
    // Used by the import manager to stop multiple import visitors being created.
    'pluginManager'     // Used as the plugin manager for the session
];

contexts.Parse = function(options) {
    copyFromOriginal(options, this, parseCopyProperties);

    if (typeof this.paths === 'string') { this.paths = [this.paths]; }
};

/** Eval context */
class Context {
    /** @todo - define proper options object */
    options: { [k: string]: any }
    
    /** Ruleset (scoping) frames */
    frames: Node[]

    importantScope: {
        important?: string
    }[]

    calcStack: boolean[]
    inCalc: boolean
    parensStack: boolean[]

    /**
     * A flag to perform math based on math options,
     * the current context position (such as in a calc()),
     * and type of math operation (such as division)
     */
    mathOn: boolean

    constructor(options, frames) {
        const {
            paths,             // additional include paths
            compress,          // whether to compress
            math,              // whether math has to be within parenthesis
            strictUnits,       // whether units need to evaluate correctly
            sourceMap,         // whether to output a source map
            importMultiple,    // whether we are currently importing multiple copies
            urlArgs,           // whether to add args into url tokens
            javascriptEnabled, // option - whether Inline JavaScript is enabled. if undefined, defaults to false
            pluginManager,     // Used as the plugin manager for the session
            importantScope,    // used to bubble up !important statements
            rewriteUrls        // option - whether to adjust URL's to be relative
        } = options

        this.options = {
            paths,            
            compress,
            math,           
            strictUnits,    
            sourceMap,      
            importMultiple,   
            urlArgs,          
            javascriptEnabled, 
            pluginManager,     
            importantScope,   
            rewriteUrls
        }

        if (typeof paths === 'string') { this.options.paths = [paths]; }

        this.frames = frames || [];
        this.importantScope = this.importantScope || [];
        this.calcStack = [];
        this.parensStack = [];
        this.inCalc = false;
        this.mathOn = true;
    }

    enterCalc() {
        this.calcStack.push(true);
        this.inCalc = true;
    }

    exitCalc() {
        this.calcStack.pop();
        if (!this.calcStack.length) {
            this.inCalc = false;
        }
    }

    enterParens() {
        this.parensStack.push(true);
    }

    exitParens() {
        this.parensStack.pop();
    }

    isMathOn(op: string) {
        if (!this.mathOn) {
            return false;
        }
        if (
            op === '/'
            && this.options.math !== ALWAYS
            && (!this.parensStack || !this.parensStack.length)
        ) {
            return false;
        }
        if (this.options.math > PARENS_DIVISION) {
            return this.parensStack && this.parensStack.length;
        }
        return true;
    }

    pathRequiresRewrite(path) {
        const isRelative = this.options.rewriteUrls === LOCAL
            ? isPathLocalRelative : isPathRelative;

        return isRelative(path);
    }

    rewritePath(path: string, rootpath: string) {
        let newPath;

        rootpath = rootpath || '';
        newPath = this.normalizePath(rootpath + path);

        // If a path was explicit relative and the rootpath was not an absolute path
        // we must ensure that the new path is also explicit relative.
        if (isPathLocalRelative(path) &&
            isPathRelative(rootpath) &&
            isPathLocalRelative(newPath) === false) {
            newPath = `./${newPath}`;
        }

        return newPath;
    }

    normalizePath(path: string): string {
        const segments = path.split('/').reverse();
        let segment;

        const pathArr = [];
        while (segments.length !== 0) {
            segment = segments.pop();
            switch ( segment ) {
                case '.':
                    break;
                case '..':
                    if ((pathArr.length === 0) || (pathArr[pathArr.length - 1] === '..')) {
                        pathArr.push( segment );
                    } else {
                        pathArr.pop();
                    }
                    break;
                default:
                    pathArr.push(segment);
                    break;
            }
        }

        return pathArr.join('/');
    }
}

contexts.Eval = Context

function isPathRelative(path: string) {
    return !/^(?:[a-z-]+:|\/|#)/i.test(path);
}

function isPathLocalRelative(path: string) {
    return path.charAt(0) === '.';
}

export { Context }
export default contexts;
