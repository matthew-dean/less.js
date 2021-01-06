import LessError from './less-error';
import transformTree from './transform-tree';
import logger from './logger';
import type { Context } from './contexts';

export class ParseTree {
    /** @todo - refine types */
    root: any;
    imports: any;
    SourceMapBuilder: any;

    constructor(root: any, imports: any) {
        this.root = root;
        this.imports = imports;
    }

    toCSS(context: Context) {
        const options = context.options;
        let evaldRoot;
        /** @todo - refine type */
        const result: Record<string, any> = {};
        let sourceMapBuilder;
        try {
            evaldRoot = transformTree(this.root, context);
        } catch (e) {
            throw new LessError(e, this.imports);
        }

        try {
            const compress = Boolean(options.compress);
            if (compress) {
                logger.warn('The compress option has been deprecated. ' + 
                    'We recommend you use a dedicated css minifier, for instance see less-plugin-clean-css.');
            }

            const toCSSOptions = {
                compress,
                dumpLineNumbers: options.dumpLineNumbers,
                strictUnits: Boolean(options.strictUnits),
                numPrecision: 8};

            if (options.sourceMap) {
                sourceMapBuilder = new this.SourceMapBuilder(options.sourceMap);
                result.css = sourceMapBuilder.toCSS(evaldRoot, {
                    options: toCSSOptions
                }, this.imports);
            } else {
                result.css = evaldRoot.toCSS({
                    options: toCSSOptions
                });
            }
        } catch (e) {
            throw new LessError(e, this.imports);
        }

        if (context.pluginManager) {
            const postProcessors = context.pluginManager.getPostProcessors();
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

export default function(SourceMapBuilder) {
    ParseTree.prototype.SourceMapBuilder = SourceMapBuilder;
    return ParseTree;
}
