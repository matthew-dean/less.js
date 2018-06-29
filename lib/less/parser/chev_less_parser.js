const { CssParser, cssTokens } = require("./chev_css_parser");
const { Lexer } = require("chevrotain");

// ----------------------------- Lexer -------------------------------------
// Scanning wise there seem to be a few very slight differences between less and CSS.
// So we will probably need to define a new Lexer like VSCode CSS Language Service.
// https://github.com/Microsoft/vscode-css-languageservice/blob/master/src/parser/lessScanner.ts

// Simple concatenation may not suffice, we may need to REPLACE some of the CSS TokenTypes
const lessTokens = [].concat(cssTokens);
const LessLexer = new Lexer(lessTokens, { ensureOptimizations: true });

// ----------------------------- Parser -------------------------------------
class LessParser extends CssParser {
  constructor() {
    // TODO: pass options object to super constructor
    super([], lessTokens, false);

    // TODO grammar rules go here.

    this.performSelfAnalysis();
  }
}
// ----------------- wrapping it all together -----------------

// reuse the same parser instance.
const parser = new LessParser([]);

module.exports = {
  parseLess: function(text) {
    const lexResult = LessLexer.tokenize(text);
    // setting a new input will RESET the parser instance's state.
    parser.input = lexResult.tokens;
    // any top level rule may be used as an entry point
    const value = parser.stylesheet();

    return {
      // This is a pure grammar, the value will be undefined until we add embedded actions
      // or enable automatic CST creation.
      value: value,
      lexErrors: lexResult.errors,
      parseErrors: parser.errors
    };
  }
};
