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

fragment Whitespace
  : ' ' | '\\t' | Newline
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
  : '\\' Hex (Hex Hex Hex Hex Hex)? Whitespace? // 1 or 6 hex digits
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
  : ('+' | '-')? Digit+
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

fragment Gt   : '>';

fragment NthFunctions
  : 'nth-child'
  | 'nth-last-child'
  | 'nth-of-type'
  | 'nth-last-of-type'
  ;
/**
 * TOKENS
 *  - default mode should look for selectors and at-rule starts
 *  - selector mode should look for selectors and '{'
 *  - at-rule mode should look for any token and blocks and outer '{'
 *  - declaration list mode should look for idents and at-rule starts and selectors (nesting)
 *  - declaration mode should look for valid value tokens and ';'
 *  - custom property mode should look for any token and blocks and outer ';'
 */

/** 
 * Uses nongreedy wildcard
 * @see https://github.com/antlr/antlr4/blob/master/doc/wildcard.md
 */
Comment     : '/*' .*? '*/' -> skip;

/**
 * Aliased because Less will not skip CSS comments
 *   e.g. (Whitespace | Comment)
 */
WS          : Whitespace;
Comma       : ',';
String      : DoubleString | SingleString;
LCurly      : '{';
RCurly      : '}';
LParen      : '(';
RParen      : ')';
LSquare     : '[';
RSquare     : ']';

/**
 * CSS syntax says we should identify integers as separate from numbers,
 * probably because there are parts of the syntax where one is allowed but not the other?
 */
UnitlessNum     : Number;
UnsignedInt     : Digit+;
SignedInt       : Integer;

/** Simple Selectors */
Star        : '*' -> mode(Selector);
Ampersand   : '&' -> mode(Selector);
ID          : '#' Ident -> mode(Selector);
Class       : '.' Ident -> mode(Selector);
Element     : Ident -> mode(Selector);

NthSyntax   : 'odd' | 'even' | Integer | Integer? [nN] (WS* [+-] WS* Digit)?;
NthChild    : ':' NthFunctions '(' WS* NthSyntax WS* ')';
Pseudo      : ':' ':'? Ident ('(' .*? ')')? -> mode(Selector);
/** @todo - lookup */
Attribute   : LSquare WS* Ident ('=') WS* (Ident | String) WS* () RSquare -> mode(Selector);


mode Selector;
Selector_WS       : WS -> type(WS);
Selector_Comma    : Comma -> type(Comma);

Selector_ID       : ID -> type(ID);
Selector_Class    : Class -> type(Class);
Selector_Element  : Element -> type(Element);
Selector_Pseudo   : Pseudo -> type(Pseudo);
Selector_Star     : Star -> type(Star);
Selector_Amp      : Ampersand -> type(Ampersand);
Selector_Attribute: Attribute -> type(Attribute);
Selector_LCurly   : LCurly -> type(LCurly), pushMode(DeclarationList);

mode DeclarationList;


ColorIdentStart : '#' [a-f];

CompareOp   : (Gt | '<') '='?;

Semi        : ';';
Colon       : ':';
PropAssign  : Colon;

Plus : '+';
Minus       : '-';
Divide      : '/';
Eq          : '=';
Tilde       : '~';
/** a namespace or column combinator */
Pipe        : '|';

Combinator  : Plus | Gt | Tilde | Pipe;
AttrMatch   : [*~|^$] '=';
PlainIdent  : Ident;
CustomProp  : '--' Ident;

Cdo         : '<!--' -> skip;
Cdc         : '-->' -> skip;

/** Ignore BOM */
UnicodeBOM  : '\uFFFE' -> skip;

AttrFlag    : [is];
Function    : Ident '(';







