export interface EvalContext {
  paths: string[];
  compress: boolean;
  math: number;
  strictUnits: boolean;
  sourceMap: Object;
  importMultiple: boolean;
  urlArgs: string;
  javascriptEnabled: boolean;
  pluginManager: Object;
  importantScope: Array<any>;
  rewriteUrls: number;
  frames: Array<any>;
  calcStack?: Array<any>;
  parensStack?: Array<any>;
  inCalc: boolean;
  mathOn: boolean;
  rewritePath(path: string, rootpath: string): string;
  normalizePath(path: string): string;
}

export interface FunctionContext {
  context: EvalContext;
  index: number;
  currentFileInfo: any;
}

export interface ParseContext {
  paths: string[];
  rewriteUrls: string;
  rootpath: string;
  strictImports: boolean;
  insecure: boolean;
  dumpLineNumbers: string;
  compress: boolean;
  syncImport: boolean;
  chunkInput: boolean;
  mime: string;
  useFileCache: boolean;
  processImports: boolean;
  pluginManager: Object;
  quiet: boolean;
}
