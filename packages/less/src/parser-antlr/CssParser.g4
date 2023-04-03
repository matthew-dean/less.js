/**
 * @see https://www.w3.org/TR/css-syntax-3/#parser-diagrams
 */

parser grammar CssParser;

stylesheet
  : (cdo | cdc | WS | qualified_rule | at_rule)* EOF
  ;

rule_list
  : (WS | qualified_rule | at_rule)*
  ;

at_rule
  : At_keyword at_rule_value* (curly_block | ';')
  ;

qualified_rule
  : qualified_rule_value* qualified_rule_block
  ;

declaration_list
  : WS* (
    declaration (';' declaration_list)?
    | at_rule declaration_list
  )
  ;

declaration
  : Ident WS* ':' declaration_value* important?
  ;

important
  : '!' WS* Important WS*
  ;


