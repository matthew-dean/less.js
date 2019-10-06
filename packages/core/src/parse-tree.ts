import LessError from './less-error'
import { SourceMapBuilder } from './source-map-builder'
import transformTree from './transform-tree'

export class ParseTree {
  SourceMapBuilder: SourceMapBuilder

  constructor(root, imports) {
    this.root = root
    this.imports = imports
  }

  toCSS(options) {
      let evaldRoot;
      const result = {};
      let sourceMapBuilder;
      try {
          evaldRoot = transformTree(this.root, options);
      } catch (e) {
          throw new LessError(e, this.imports);
      }

      try {
          const toCSSOptions = {
              dumpLineNumbers: options.dumpLineNumbers,
              strictUnits: Boolean(options.strictUnits),
              numPrecision: 8
          };

          if (options.sourceMap) {
              sourceMapBuilder = new SourceMapBuilder(options.sourceMap);
              result.css = sourceMapBuilder.toCSS(evaldRoot, toCSSOptions, this.imports);
          } else {
              result.css = evaldRoot.toCSS(toCSSOptions);
          }
      } catch (e) {
          throw new LessError(e, this.imports);
      }

      if (options.pluginManager) {
          const postProcessors = options.pluginManager.getPostProcessors();
          for (let i = 0; i < postProcessors.length; i++) {
              result.css = postProcessors[i].process(result.css, { sourceMap: sourceMapBuilder, options, imports: this.imports });
          }
      }
      if (options.sourceMap) {
          result.map = sourceMapBuilder.getExternalSourceMap();
      }

      result.imports = [];
      for (const file in this.imports.files) {
          if (this.imports.files.hasOwnProperty(file) && file !== this.imports.rootFilename) {
              result.imports.push(file);
          }
      }
      return result;
  }
}

export default (SourceMapBuilder: SourceMapBuilder) => {
  ParseTree.prototype.SourceMapBuilder = SourceMapBuilder
  return ParseTree
}
