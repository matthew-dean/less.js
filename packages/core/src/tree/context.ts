import { MathMode, RewriteUrlMode, EvalErrorMode } from '../constants'
import { IOptions } from '../options'
import { Rules, Selector, List, ImportRule, Color, Dimension, Node } from './nodes'
import LessError, { ILessError } from '../less-error'
import { Less } from '../index'
import Environment from '../environment/environment'

function isPathRelative(path: string) {
    return !/^(?:[a-z-]+:|\/|#)/i.test(path);
}

function isPathLocalRelative(path: string) {
  return path.charAt(0) === '.';
}

/** 
 * @note Renamed from contexts.Eval 
 * 
 * This is a class instance that gets passed in during evaluation.
 * It keeps a reference to global Less options, as well
 * as environment settings. It also tracks state as it enters
 * and exits blocks, in order to determine what math settings
 * should be applied.
*/
export class Context {
  less: Less
  environment: Environment
  inCalc: boolean
  mathOn: boolean
  importantScope: { important?: string }[]
  calcStack: boolean[]
  blockStack: boolean[]
  options: IOptions

  /** @todo - remove or explain */
  mediaPath: any[]
  mediaBlocks: any[]

  /**
   * As we crawl the tree, we build up a stack of
   * parent selectors we can use for merging into child selectors
   */
  selectors: (List<Selector>)[]

  importQueue: ImportRule[]

  /**
   * AFAICT, frames are a stack of Rules nodes, used for scoping (and lookups?)
   * @todo - is this neded?
   */
  frames: Rules[]
  
  private errors: ILessError[]
  private warnings: ILessError[]
  scope: {
    [key: string]: any
  }

  constructor(less: Less, environment: Environment, options: IOptions) {
    this.less = less
    this.environment = environment
    this.options = options
    this.selectors = []
    this.frames = []
    this.importantScope = []
    this.blockStack = []
    this.inCalc = false
    this.mathOn = true
    /** Replacement for function registry */
    // this.scope = Object.create(environment.scope || null)
  }

  error(err: ILessError, fileRoot: Rules) {
    if (this.options.evalErrors === EvalErrorMode.THROW) {
      throw err
    }
    this.errors.push(new LessError(err, fileRoot))
  }

  warning(warn: ILessError, fileRoot: Rules) {
    warn.type = 'Warning'
    this.warnings.push(new LessError(warn, fileRoot))
  }

  enterCalc() {
    if (!this.calcStack) {
      this.calcStack = []
    }
    this.calcStack.push(true)
    this.inCalc = true
  }

  exitCalc() {
    this.calcStack.pop()
    this.inCalc = this.calcStack.length !== 0
  }

  /**
   * When entering a parens `(` or bracket block `[`,
   * this will be true. However, when entering a function or mixin, we push
   * `false` into the stack, to 'reset' for the purposes of figuring out
   * if math should be applied.
   */
  enterBlock(blockValue: boolean = true) {
    this.blockStack.unshift(blockValue)
  }

  exitBlock() {
    this.blockStack.shift()
  }

  isMathOn(op?: string) {
    if (!this.mathOn) {
      return false
    }
    const mathMode = this.options.math
    if (op === '/' && this.blockStack[0] !== true) {
      return false
    }
    if (mathMode > MathMode.NO_DIVISION) {
      return this.blockStack[0]
    }
    return true
  }

  resolveModule(fileContent: string) {
    /** This will return a JS object from a string */
    const obj = this.environment
  }

  // pathRequiresRewrite(path: string) {
  //   const isRelative = this.options.rewriteUrls === RewriteUrlMode.LOCAL ? isPathLocalRelative : isPathRelative

  //   return isRelative(path)
  // }

  /** @todo - break into environment */
  // rewritePath(path: string, rootpath) {
  //   let newPath;

  //   rootpath = rootpath || ''
  //   newPath = this.normalizePath(rootpath + path)

  //   // If a path was explicit relative and the rootpath was not an absolute path
  //   // we must ensure that the new path is also explicit relative.
  //   if (isPathLocalRelative(path) &&
  //     isPathRelative(rootpath) &&
  //     isPathLocalRelative(newPath) === false) {
  //     newPath = `./${newPath}`
  //   }

  //   return newPath
  // }

  /** @todo - should be on environment fileManager */
  // normalizePath(path) {
  //   const segments = path.split('/').reverse()
  //   let segment;

  //   path = [];
  //   while (segments.length !== 0) {
  //     segment = segments.pop();
  //     switch ( segment ) {
  //       case '.':
  //         break;
  //       case '..':
  //         if ((path.length === 0) || (path[path.length - 1] === '..')) {
  //             path.push( segment );
  //         } else {
  //             path.pop();
  //         }
  //         break;
  //       default:
  //         path.push(segment);
  //         break;
  //     }
  //   }

  //   return path.join('/')
  // }
}
