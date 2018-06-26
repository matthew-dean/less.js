@{%
  function sel(match, indices) {
    return match.map(function(m) {
      var arr = [];
        indices.forEach(function(i) {
          arr.push(m[i]);
        });
        return arr;
    });
  }
%}

@builtin "whitespace.ne"
@builtin "postprocessors.ne"
@builtin "string.ne"

# Here in, the parsing rules/functions (as originally written by Alexis Sellier)
#
# The basic structure of the syntax tree generated is as follows:
#
#   Ruleset ->  Declaration -> Value -> Expression -> Entity
#
# Here's some Less code:
#
#    .class {
#      color: #fff;
#      border: 1px solid #000;
#      width: @w + 4px;
#      > .child {...}
#    }
#
# And here's what the parse tree might look like:
#
#     Ruleset (Selector '.class', [
#         Declaration ("color",  Value ([Expression [Color #fff]]))
#         Declaration ("border", Value ([Expression [Dimension 1px][Keyword "solid"][Color #000]]))
#         Declaration ("width",  Value ([Expression [Operation " + " [Variable "@w"][Dimension 4px]]]))
#         Ruleset (Selector [Element '>', '.child'], [...])
#     ])

Stylesheet
 -> _ Root {% $({'Stylesheet': 1}) %}

Root
 -> Primary {% d => [d[0]] %}
  | Root _ Primary {% d => d[0].concat(d[2]) %}

# The `primary` rule is the main part of the parser.
# The rules here can appear at any level of the parse tree.
#
# The `primary` rule is represented by this simplified grammar:
#
#     primary  →  (ruleset | declaration)+
#     ruleset  →  selector+ block
#     block    →  '{' primary '}'
#
# Only at one point is the primary rule not called from the
# block rule: at the root level.

Primary
 -> Ruleset {% id %}
  | MixinDefinition {% id %}
  | MixinCall _semi {% id %}
  | FunctionCall _semi {% $({'Call': 0}) %}
  | VariableDefinition _semi
  | VariableDefinition (_semi _ Primary):? {% $({'Variable': 0}) %}
  | AtRule _semi {% $({'AtRule': 0}) %}

AtRule
 -> "@" Ident _ [^:] Block:?  # need arguments etc

Ruleset
 -> Comment:? SelectorList _ Block {% d => { return { type: 'Ruleset', comment: d[0], selectors: d[1], rules: d[3]} } %}

Block
 -> "{" _ Rule:* _ "}" {% d => d[2][0] %}

# Unlike the root, rules in blocks can have a declaration
Rule
 -> Declaration _semi:? {% d => [d[0]] %}
  | Declaration _semi _ Rule  {% d => { return [d[0]].concat(d[3]) } %}
  | Primary
    
SelectorList 
 -> Selector {% d => { return [{ type: 'Selector', elements: d[0]}] } %}
  | SelectorList _ "," _ Selector {% d => d[0].concat([{ type: 'Selector', elements: d[4]}]) %}

# A Mixin definition, with a list of parameters
#
#     .rounded (@radius: 2px, @color) {
#        ...
#     }
#
# We start by matching `.rounded (`, and then proceed on to
# the argument list, which has optional default values.
# We store the parameters in `params`, with a `value` key,
# if there is a value, such as in the case of `@radius`.
#
# Once we've got our params list, and a closing `)`, we parse
# the `{...}` block.
#
MixinDefinition
 -> ClassOrId "(" Args:? ")" _ (Guard _):? Block {% d => { return { type: 'MixinDefinition', name: d[0], params: d[2], condition: d[4], rules: d[6] } } %}

Selector
 -> Element {% d => [{ type: 'Element', combinator: '', value: d[0]}] %}
  | Selector NonIdentElement {% d => d[0].concat([d[1]]) %}
  | Selector __ Element {% d => d[0].concat([{ type: 'Element', combinator: ' ', value: d[2]} ]) %}
  | Selector _ Combinator _ Element {% d => d[0].concat([{ type: 'Element', combinator: d[2], value: d[4]}]) %}

NonIdentElement
 -> Class {% id %}
  | Id {% id %}
  | Attr {% id %}
  | "&" {% id %}
  | Pseudo {% id %}
 
Element
 -> Class {% id %}
  | Id {% id %}
  | Ident {% id %}
  | Attr {% id %}
  | "&" {% id %}
  | Pseudo {% id %}
  | "*" {% id %}
  
# Elements
Class 
 -> "." Ident {% d => '.' + d[1] %}

Id
 -> "#" Ident {% d => '#' + d[1] %}

Combinator  # Current CSS4 combinators on the end
 -> ">" {% id %}
 | "+" {% id %}
 | "~" {% id %}
 | "|" {% id %}
 | ">>" {% id %}
 | "||" {% id %}
 | ">>>" {% id %}     

Attr
 -> "[" Ident ([|~*$^]:? "=" (Quoted | [^\]]:+)):? (_ "i"):? "]" {% d => { return { type: 'Attribute', value: d.join('') } } %}

Pseudo
 -> ":" ":":? Ident ("(" PseudoArgs ")"):? 
    {% 
      (d, l, reject) => {
		let name = d[2]
		let args = d[3] ? d[3][1] : d[3]
		  
		// :extend(.selector !all) - optional exclamation
		if (name === 'extend') {
			console.log(args) 
			// :extend can't extend multiple selectors yet
			if (!args || args.indexOf(',') > -1) {
				return reject
			}
			let flag = args[args.length - 1] 
			if (flag.match(/[!]?all/)) {  // todo: 'deep'
				flag = args.pop();
			}
			return { type: 'Extend', selector: args }
		}
	    return d[0] + (d[1] ? d[1] : '') + d[2]
		
	  } 
	%}

PseudoArgs
 -> "!":? Element {% d => { return d[0] ? '!' + d[1] : d[1] } %}
  | PseudoArgs (__|_ "," _) "!":? Element {% d => d[0].concat(d[1][1] ? [d[1][1], d[2] ? '!' + d[3] : d[3]] : d[2]) %}

ClassOrId 
 -> Class {% id %}
 | Id {% id %}

Declaration
 -> Ident _ ":" _ Value
    {%
      d => { 
        return {
          type: 'Declaration',
          name: d[0],
          value: d[4]
        }
	    }
	  %}

VariableDefinition
 -> Variable _ ":" _ VariableValue
    {% 
      d => {
        return { 
          type: 'Declaration', 
          name: d[0],
          variable: true,
          value: d[4] 
        }
	    }
    %}
 
VariableValue
 -> Value | DetachedRuleset

DetachedRuleset
 -> Block {% d => { return { type: 'DetachedRuleset', ruleset: { type: 'Ruleset', rules: d[0] } }} %}

Value
 -> ExpressionList (_ "!" _ "important"):? {% d => { return { type: 'Value', value: d[0], important: d[1] ? true : false } } %}

ExpressionList
 -> Expression {% d => { return { type: 'Expression', value: d[0] }} %}
  | ExpressionList _ "," _ Expression {% d => { return { type: 'Expression', value: d[0].concat([d[4]]) } } %}
  
# Expressions either represent mathematical operations,
# or white-space delimited Entities.
#
#  Examples:
#     1px solid black
#     @var * 2
#     @var*(2 / 1)
#     30px / 1.1
#
Expression
 -> Entity (__ Entity):* {% d => d[1] ? [d[0]].concat(d[1][0]): [d[0]] %}

# Entities are tokens which can be found inside an Expression
Entity
 -> Comment {% id %}
  | Literal {% id %}
  | Url {% id %}
  | Keyword {% d => { return { type: 'Keyword', value: d[0]} } %}
  | "/" {% id %}
  | Javascript {% id %}

  Literal
   -> Quoted
    | UnicodeDescriptor
  
  ExpressionParts
   -> Unit
    | FunctionCall
    | Color
    | Variable
    | PropReference
 
  # QUOTED
  # A string, which supports escaping " and '
  #
  #     "milky way" 'he\'s the one!'
  #
  # TODO - parse vars directly
  Quoted -> dqstring | sqstring


  Num        -> (Int:? "."):? Int
  Percentage -> Num "%"
  Dimension  -> Num Ident
  Unit       -> Num ("%" | Ident):?

  # KEYWORD
  # A catch-all word, such as:
  #
  #     black border-collapse
  #
  Keyword -> AlphaDash AlphaNumDash:* {% d => d[0][0] + d[1].join('') %}
 
  # FUNCTION CALL
  #
  #     rgb(255, 0, 255)
  #
  FunctionCall
   -> (Ident | "%") "(" Args ")"

  Assignment
   -> Keyword "=" Value 

  Url
   -> "url(" _ (Quoted | [^)]:*) _ ")"     # -- need to extract the url

  Prop -> PropReference | PropReferenceCurly
  Var -> Variable | VariableCurly
  Interpolator -> VariableCurly | PropReferenceCurly

  PropReference
   -> "$" LessIdent

  PropReferenceCurly
   -> "${" LessIdent "}"

  Variable
   -> "@" "@":? LessIdent {% d => d.join('') %}

  VariableCurly
   -> "@{" LessIdent "}" {% d => d.join('') %}

  Color
   -> "#" Hex3 Hex3:? {% d => d.join('') %}

  UnicodeDescriptor
   -> "U+" [0-9a-fA-F?]:+ ("-" [0-9a-fA-F?]:+):? {% d => d.join('') %}

  Javascript
   -> "~":? "`" [^`]:* "`"

#
# A Mixin call, with an optional argument list
#
#   Parses:
#     #mixins > .square(#fff);
#     #mixins .square(#fff);
#     #mixins.square(#fff);
#     .rounded(4px, { rule: value });
#     .button;
#
MixinCall
 -> MixinSelectors ("(" _ Args:? _ ")"):? {% d => [{ type: 'MixinCall', elements: d[0], params: d[1] ? d[1][2] : null }] %}
 
MixinSelectors
 -> ClassOrId {% d => { return { type: 'Element', name: d[0] } } %}
  | MixinSelectors _ ">":? _ ClassOrId {% d => d[0].concat([{ type: 'Element', name: d[0], combinator: '>' }]) %}

SemiArgValue
 -> Expression
  | DetachedRuleset

CommaArgValue
 -> ExpressionList {% id %}
  | DetachedRuleset {% id %}

_semi -> _ ";" {% d => null %}

Args
 -> CommaArgValue (_ "," _ CommaArgValue):*
    {%
		d => d
    %}
  | SemiArgValue _ ";" (_ SemiArgValue):? (_ ";" _ SemiArgValue):*

# TEMP
Guard -> "when" _ Condition
Condition -> "6"

# Comments are collected by the main parsing mechanism and then assigned to nodes
# where the current structure allows it.
Comment
 -> _ Comment _
   | "//" [^\n\r]:* 
   | "/*" CommentChars:* "*/"
        
CommentChars
 -> "*" [^/] 
   | [^*]

# Identifiers - move to moo lexer?
LessIdent -> AlphaNumDash:+ {% d => d[0].join('') %}
Ident
 -> NameStart NameChar:* {% d => d[0] + d[1].join('') %}

# Primitives - move to moo lexer?
Op
 -> "*" | "+" | "-" | "/" | "./"
Int
 -> [0-9]:+ {% d => d.join('') %}
Hex3
 -> Hex Hex Hex {% d => d.join('') %}
Hex
 -> [a-fA-F0-9]
NameStart
 -> AlphaDash
  | NonAscii
  | Escape 
NameChar
 -> AlphaNumDash | NonAscii | Escape 

AlphaDash -> [a-zA-Z_-] {% d => d.join('') %}
AlphaNumDash -> [A-Za-z0-9_-] {% d => d.join('') %}

NonAscii
 -> [\u0080-\uD7FF\uE000-\uFFFD]
Escape
 -> Unicode | "\\" [\u0020-\u007E\u0080-\uD7FF\uE000-\uFFFD]
Unicode
 -> "\\" Hex:+

