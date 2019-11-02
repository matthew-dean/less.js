import { Context } from '../tree/context'
import { IFileInfo } from '../tree/nodes'
import AssetManager from '../asset-manager'
import { Parser as CstParser } from '@less/parser'
import { IOptions } from '../options'

/**
 * This is an abstraction between the Less CST parser
 * and the Less AST. Essentially, this forwards parsing to
 * the @less/parser package, and, if successful, builds an
 * AST out of the returned CST.
 */
export default class Parser {
  context: Context
  assets: AssetManager
  fileInfo: IFileInfo
  static parser: CstParser

  constructor (context: Context, assets: AssetManager, fileInfo: IFileInfo) {
    this.context = context
    this.assets = assets
    this.fileInfo = fileInfo
    if (!Parser.parser) {
      Parser.parser = new CstParser()
    }
  }

  parse (input: string, options: IOptions, callback: Function) {
    const { cst, lexerResult, parser } = Parser.parser.parse(input)
    if (lexerResult.errors.length > 0) {
      return callback(lexerResult.errors)
    }
    if (parser.errors.length > 0) {
      return callback(parser.errors)
    }
    /** @else crawl the CST and make an AST! */
  }
}
