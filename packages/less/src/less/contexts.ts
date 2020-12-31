import * as Constants from './constants';
import type Ruleset from './tree/ruleset';
import type Media from './tree/media';
import type Selector from './tree/selector';

const {
    ALWAYS,
    PARENS_DIVISION
} = Constants.Math

const { LOCAL } = Constants.RewriteUrls


 /** 
  * This is the "context" object passed to the historical
  * parser.
  * 
  * @todo - Is it necessary in these two contexts to copy
  *         options? Are options ever mutated?
  */
class ParseContext {
    /** @todo - define proper options object */
    options: { [k: string]: any }

    constructor(options) {
        const {
            // options
            paths,            // option - unmodified - paths to search for imports on
            rewriteUrls,      // option - whether to adjust URL's to be relative
            rootpath,         // option - rootpath to append to URL's
            strictImports,    // option -
            insecure,         // option - whether to allow imports from insecure ssl hosts
            dumpLineNumbers,  // option - whether to dump line numbers
            compress,         // option - whether to compress
            syncImport,       // option - whether to import synchronously
            chunkInput,       // option - whether to chunk input. more performant but causes parse issues.
            mime,             // browser only - mime type for sheet import
            useFileCache,     // browser only - whether to use the per file session cache
            // context
            processImports,   // option & context - whether to process imports. if false then imports will not be imported.
            // Used by the import manager to stop multiple import visitors being created.
            pluginManager     // Used as the plugin manager for the session
        } = options

        this.options = {
            paths, 
            rewriteUrls,
            rootpath,   
            strictImports,
            insecure,     
            dumpLineNumbers,
            compress,       
            syncImport,     
            chunkInput,     
            mime,
            useFileCache,
            processImports,
            pluginManager
        }
        if (typeof paths === 'string') { this.options.paths = [paths]; }
    }
}

/** 
 * This is the context object passed during evaluation.
 */
class Context {
    /** @todo - define proper options object */
    options: { [k: string]: any }
    
    /** Ruleset (scoping) frames */
    frames: Ruleset[]

    mediaBlocks: Media[]

    /** Current selectors */
    selectors: Selector[][]

    /** A marker set for the last rule in a ruleset */
    lastRule: boolean

    /** A marker set for the first selector in a list */
    firstSelector: boolean

    importantScope: {
        important?: string
    }[]

    calcStack: boolean[]
    inCalc: boolean
    parensStack: boolean[]

    /** How indented we currently should be */
    tabLevel: number

    /**
     * A flag to perform math based on math options,
     * the current context position (such as in a calc()),
     * and type of math operation (such as division)
     */
    mathOn: boolean

    constructor(options: Record<any, any>) {
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

        this.frames = [];
        this.selectors = [];
        this.importantScope = this.importantScope || [];
        this.calcStack = [];
        this.parensStack = [];
        this.inCalc = false;
        this.mathOn = true;
    }

    /** 
     * Create a new derived context object from
     * the current context.
     * 
     * Optionally create a new frames array 
     */
    create(frames?: Ruleset[]): Context {
        const context = Object.create(this)
        if (frames && Array.isArray(frames)) {
            context.frames = frames;
        }
        return context
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

const contexts = {
    Parse: ParseContext,
    Eval: Context
}

function isPathRelative(path: string) {
    return !/^(?:[a-z-]+:|\/|#)/i.test(path);
}

function isPathLocalRelative(path: string) {
    return path.charAt(0) === '.';
}

export { Context }
export default contexts;
