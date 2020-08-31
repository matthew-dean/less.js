import { Context } from '../tree/context'
import { IFileInfo, Node } from '../tree/nodes'
import AssetManager from '../asset-manager'
import { Parser as CstParser } from '@less/parser'
import { IOptions } from '../options'
import { ICstVisitor } from 'chevrotain'
import { CstVisitor } from './cst-visitor'

/**
 * This is an abstraction between the Less CST parser
 * and the Less AST. Essentially, this forwards parsing to
 * the @less/parser package, and, if successful, builds an
 * AST out of the returned CST.
 */
export class AstParser {
  context: Context
  assets: AssetManager
  fileInfo: IFileInfo
  static cstParser: CstParser
  static cstVisitor: ICstVisitor<any, any>

  /** Are these constructor vars necessary? */
  constructor(context?: Context, assets?: AssetManager, fileInfo?: IFileInfo) {
    this.context = context
    this.assets = assets
    this.fileInfo = fileInfo

    if (!AstParser.cstParser) {
      const parser = new CstParser()
      AstParser.cstParser = parser
      AstParser.cstVisitor = CstVisitor(parser.parser)
    }
  }

  parse(input: string, callback: (err: any, root?: Node) => void, options: Partial<IOptions> = {}) {
    const { cst, lexerResult, parser } = AstParser.cstParser.parse(input)
    if (lexerResult.errors.length > 0) {
      return callback(lexerResult.errors)
    }
    if (parser.errors.length > 0) {
      return callback(parser.errors)
    }

    callback(null, AstParser.cstVisitor.visit(cst))
  }
}
