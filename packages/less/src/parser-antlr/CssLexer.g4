/**
 * references:
 * https://github.com/antlr/grammars-v4/blob/master/css3/css3.g4
 * https://www.lifewire.com/css2-vs-css3-3466978
 * https://www.w3.org/TR/css-syntax-3/
 * https://github.com/jesscss/jess/blob/master/packages/css-parser/src/cssTokens.ts
 */
lexer grammar CssLexer;

fragment Newline
  : '\\n' | '\\r' '\\n'? | '\\f'
  ;

fragment WS
  : ' ' | '\\t' | Newline
  ;

/** 
 * Uses nongreedy wildcard
 * @see https://github.com/antlr/antlr4/blob/master/doc/wildcard.md
 */
fragment Comment
  : '/*' .*? '*/'
  ;

fragment Digit
  : '0'..'9'
  ;

fragment Hex
  : Digit
  | 'a'..'f'
  | 'A'..'F'
  ;

fragment Unicode
  : '\\' Hex (Hex Hex Hex Hex Hex)? WS? // 1 or 6 hex digits
  ;

fragment Escape
  : Unicode
  | '\\' ~[\r\n\f0-9a-fA-F]
  ;

fragment DoubleString
  : '"' ('\\' | ~[\n\r\f"] | Newline | Escape) '"'
  ;

fragment SingleString
  : '\'' ('\\' | ~[\n\r\f'] | Newline | Escape) '\''
  ;

fragment String
  : DoubleString | SingleString
  ;

fragment NonAscii
  : '\u0240'..'\uffff'
  ;

fragment NmStart
  : '_' | NonAscii | Escape
  ;

fragment NmChar
  : [_a-zA-Z0-9-]
  | NonAscii
  | Escape
  ;

fragment Ident
  : '-?' NmStart NmChar*
  ;

/** Reference: https://www.w3.org/TR/css-syntax-3/#consume-url-token */
fragment UrlFragment
  : (~(
    '('
    | '"'
    | '\''
    // Non-printable
    | '\u0000'..'\u0008'
    | '\u000b'
    | '\u000e'..'\u001f'
    | '\u007f'
  ))*
  ;

fragment Integer
  : ('+' | '-')? ('0'..'9')+
  ;

fragment Exp
  : [eE][+-]Digit+
  ;

/** Any number that's not simply an integer e.g. 1.1 or 1e+1 */
fragment Number
  : ('+' | '-')?
  (
    Digit* '.' Digit+ Exp?
    | Digit+ Exp?
  )
  ;

fragment WSorComment
  : (WS | Comment)*
  ;

fragment Gt   : '>';

CompareOp   : (Gt | '<') '='?;
LCurly      : '{';
RCurly      : '}';
LParen      : '(';
RParen      : ')';
LSquare     : '[';
RSquare     : ']';
Semi        : ';';

Plus : '+';
Minus       : '-';
Comma       : ',';
Divide      : '/';
Eq          : '=';
Star        : '*';
Tilde       : '~';

Combinator  : Plus | Gt | Tilde;






