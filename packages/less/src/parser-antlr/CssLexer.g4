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
Comment     : '/*' .*? '*/' -> channel(HIDDEN);

/**
 * Aliased because Less will not skip CSS comments
 *   e.g. (Whitespace | Comment)
 */
WS          : Whitespace -> channel(HIDDEN);

Cdo         : '<!--' -> skip;
Cdc         : '-->' -> skip;

/** Ignore BOM */
UnicodeBOM  : '\uFFFE' -> skip;

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
Function        : Ident '(';

Semi            : ';';
CompareOp       : ('>' | '<') '='? | '<' | '>';

Plus        : '+';
Minus       : '-';
Divide      : '/';
Eq          : '=';
Tilde       : '~';
/** a namespace or column combinator */
Pipe        : '|';


/** Simple Selectors */
Star        : '*' -> mode(Selector);
Ampersand   : '&' -> mode(Selector);
ID          : '#' Ident -> mode(Selector);
Class       : '.' Ident -> mode(Selector);
Element     : Ident -> mode(Selector);

fragment NthSyntax   : 'odd' | 'even' | Integer | Integer? [nN] (WS* [+-] WS* Digit)?;
PseudoNth   : ':' NthFunctions '(' WS* NthSyntax WS* ')' -> mode(Selector);
Pseudo      : ':' ':'? Ident ('(' .*? ')')? -> mode(Selector);
/** @todo - lookup */
Attribute   : LSquare WS* Ident [*~|^$]? ('=') WS* (Ident | String) WS* ([is] WS*)? RSquare -> mode(Selector);

/** Non-nested */
ImportRule        : '@import';
CharsetRule       : '@charset';
NamespaceRule     : '@namespace';

/** Nested */
MediaRule         : '@media';
SupportsRule      : '@supports';
PageRule          : '@page';
FontFaceRule      : '@font-face';
KeyframesRule     : '@keyframes';
ContainerRule     : '@container';
PropertyRule      : '@property';
LayerRule         : '@layer';
ScopeRule         : '@scope';

AtRule            : '@' Ident;

// Parse specifically later?
// CounterStyleRule  : '@counter-style';
// FontFeatureRule   : '@font-feature-values';
//   SwashRule       : '@swash';
//   AnnotationRule  : '@annotation';
//   OrnamentsRule   : '@ornaments';
//   StylisticRule   : '@stylistic';
//   StylesetRule    : '@styleset';
//   CharacterVarRule: '@character-variant';

mode Selector;
/** Un-skipped white-space */
Sel_WS            : Whitespace -> type(WS);
Sel_Comma         : Comma -> type(Comma);

Sel_Star          : Star -> type(Star);
Sel_Amp           : Ampersand -> type(Ampersand);
Sel_ID            : ID -> type(ID);
Sel_Class         : Class -> type(Class);
Sel_Element       : Ident -> type(Element);
Sel_PseudoNth     : PseudoNth -> type(PseudoNth);
Sel_Pseudo        : Pseudo -> type(Pseudo);
Sel_Attribute     : Attribute -> type(Attribute);

Sel_Combinator    : [~>+] | '||';
Sel_LCurly        : LCurly -> type(LCurly), pushMode(DeclarationList);

mode DeclarationList;

DList_WS          : Whitespace -> channel(HIDDEN);
DList_Comma       : Comma -> mode(Selector), type(Comma);

DList_Star        : Star -> mode(Selector), type(Star);
DList_Amp         : Ampersand -> mode(Selector), type(Ampersand);
DList_ID          : ID -> mode(Selector), type(ID);
DList_Class       : Class -> mode(Selector), type(Class);
// DeclarationList_Element -- not valid
DList_PseudoNth   : PseudoNth -> mode(Selector), type(PseudoNth);
DList_Pseudo      : Pseudo -> mode(Selector), type(Pseudo);
DList_Attribute   : Attribute -> mode(Selector), type(Attribute);

/** Can start with a combinator in some modes */
DList_Combinator  : Sel_Combinator -> mode(Selector);
DList_CustomProp  : '--' NmStart NmChar* WS* ':' -> mode(CustomPropertyValue);

mode CustomPropertyValue;

/** Just needs matching blocks */
Custom_Value
  : ~[{(['"]+
  | String
  | '{' Custom_Value? '}'
  | '[' Custom_Value? ']'
  | '(' Custom_Value? ')'
  ;

Custom_Semi       : ';' -> type(Semi), popMode;









