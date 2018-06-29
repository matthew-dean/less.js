// Generated automatically by nearley, version 2.13.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

  function sel(match, indices) {
    return match.map(function(m) {
      var arr = [];
        indices.forEach(function(i) {
          arr.push(m[i]);
        });
        return arr;
    });
  }


// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function nth(n) {
    return function(d) {
        return d[n];
    };
}


// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function $(o) {
    return function(d) {
        var ret = {};
        Object.keys(o).forEach(function(k) {
            ret[k] = d[o[k]];
        });
        return ret;
    };
}
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "__$ebnf$1", "symbols": ["wschar"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "wschar", "symbols": [/[ \t\n\v\f]/], "postprocess": id},
    {"name": "dqstring$ebnf$1", "symbols": []},
    {"name": "dqstring$ebnf$1", "symbols": ["dqstring$ebnf$1", "dstrchar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "dqstring", "symbols": [{"literal":"\""}, "dqstring$ebnf$1", {"literal":"\""}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "sqstring$ebnf$1", "symbols": []},
    {"name": "sqstring$ebnf$1", "symbols": ["sqstring$ebnf$1", "sstrchar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "sqstring", "symbols": [{"literal":"'"}, "sqstring$ebnf$1", {"literal":"'"}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "btstring$ebnf$1", "symbols": []},
    {"name": "btstring$ebnf$1", "symbols": ["btstring$ebnf$1", /[^`]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "btstring", "symbols": [{"literal":"`"}, "btstring$ebnf$1", {"literal":"`"}], "postprocess": function(d) {return d[1].join(""); }},
    {"name": "dstrchar", "symbols": [/[^\\"\n]/], "postprocess": id},
    {"name": "dstrchar", "symbols": [{"literal":"\\"}, "strescape"], "postprocess": 
        function(d) {
            return JSON.parse("\""+d.join("")+"\"");
        }
        },
    {"name": "sstrchar", "symbols": [/[^\\'\n]/], "postprocess": id},
    {"name": "sstrchar", "symbols": [{"literal":"\\"}, "strescape"], "postprocess": function(d) { return JSON.parse("\""+d.join("")+"\""); }},
    {"name": "sstrchar$string$1", "symbols": [{"literal":"\\"}, {"literal":"'"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "sstrchar", "symbols": ["sstrchar$string$1"], "postprocess": function(d) {return "'"; }},
    {"name": "strescape", "symbols": [/["\\\/bfnrt]/], "postprocess": id},
    {"name": "strescape", "symbols": [{"literal":"u"}, /[a-fA-F0-9]/, /[a-fA-F0-9]/, /[a-fA-F0-9]/, /[a-fA-F0-9]/], "postprocess": 
        function(d) {
            return d.join("");
        }
        },
    {"name": "Stylesheet", "symbols": ["_", "Root"], "postprocess": $({'Stylesheet': 1})},
    {"name": "Root", "symbols": ["Primary"], "postprocess": d => [d[0]]},
    {"name": "Root", "symbols": ["Root", "_", "Primary"], "postprocess": d => d[0].concat(d[2])},
    {"name": "Primary", "symbols": ["Ruleset"], "postprocess": id},
    {"name": "Primary", "symbols": ["MixinDefinition"], "postprocess": id},
    {"name": "Primary", "symbols": ["MixinCall", "_semi"], "postprocess": id},
    {"name": "Primary", "symbols": ["FunctionCall", "_semi"], "postprocess": $({'Call': 0})},
    {"name": "Primary", "symbols": ["VariableDefinition", "_semi"]},
    {"name": "Primary$ebnf$1$subexpression$1", "symbols": ["_semi", "_", "Primary"]},
    {"name": "Primary$ebnf$1", "symbols": ["Primary$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Primary$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Primary", "symbols": ["VariableDefinition", "Primary$ebnf$1"], "postprocess": $({'Variable': 0})},
    {"name": "Primary", "symbols": ["AtRule", "_semi"], "postprocess": $({'AtRule': 0})},
    {"name": "AtRule$ebnf$1", "symbols": ["Block"], "postprocess": id},
    {"name": "AtRule$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "AtRule", "symbols": [{"literal":"@"}, "Ident", "_", /[^:]/, "AtRule$ebnf$1"]},
    {"name": "Ruleset$ebnf$1", "symbols": ["Comment"], "postprocess": id},
    {"name": "Ruleset$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Ruleset", "symbols": ["Ruleset$ebnf$1", "SelectorList", "_", "Block"], "postprocess": d => { return { type: 'Ruleset', comment: d[0], selectors: d[1], rules: d[3]} }},
    {"name": "Block$ebnf$1", "symbols": []},
    {"name": "Block$ebnf$1", "symbols": ["Block$ebnf$1", "Rule"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Block", "symbols": [{"literal":"{"}, "_", "Block$ebnf$1", "_", {"literal":"}"}], "postprocess": d => d[2][0]},
    {"name": "Rule$ebnf$1", "symbols": ["_semi"], "postprocess": id},
    {"name": "Rule$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Rule", "symbols": ["Declaration", "Rule$ebnf$1"], "postprocess": d => [d[0]]},
    {"name": "Rule", "symbols": ["Declaration", "_semi", "_", "Rule"], "postprocess": d => { return [d[0]].concat(d[3]) }},
    {"name": "Rule", "symbols": ["Primary"]},
    {"name": "SelectorList", "symbols": ["Selector"], "postprocess": d => { return [{ type: 'Selector', elements: d[0]}] }},
    {"name": "SelectorList", "symbols": ["SelectorList", "_", {"literal":","}, "_", "Selector"], "postprocess": d => d[0].concat([{ type: 'Selector', elements: d[4]}])},
    {"name": "MixinDefinition$ebnf$1", "symbols": ["Args"], "postprocess": id},
    {"name": "MixinDefinition$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "MixinDefinition$ebnf$2$subexpression$1", "symbols": ["Guard", "_"]},
    {"name": "MixinDefinition$ebnf$2", "symbols": ["MixinDefinition$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "MixinDefinition$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "MixinDefinition", "symbols": ["ClassOrId", {"literal":"("}, "MixinDefinition$ebnf$1", {"literal":")"}, "_", "MixinDefinition$ebnf$2", "Block"], "postprocess": d => { return { type: 'MixinDefinition', name: d[0], params: d[2], condition: d[4], rules: d[6] } }},
    {"name": "Selector", "symbols": ["Element"], "postprocess": d => [{ type: 'Element', combinator: '', value: d[0]}]},
    {"name": "Selector$ebnf$1", "symbols": ["NonIdentElement"]},
    {"name": "Selector$ebnf$1", "symbols": ["Selector$ebnf$1", "NonIdentElement"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Selector", "symbols": ["Element", "Selector$ebnf$1"]},
    {"name": "Selector", "symbols": ["Selector", "__", "Element"]},
    {"name": "Selector", "symbols": ["Selector", "_", "Combinator", "_", "Element"], "postprocess": d => d[0].concat([d[2]])},
    {"name": "NonIdentElement", "symbols": ["Class"], "postprocess": id},
    {"name": "NonIdentElement", "symbols": ["Id"], "postprocess": id},
    {"name": "NonIdentElement", "symbols": ["Attr"], "postprocess": id},
    {"name": "NonIdentElement", "symbols": [{"literal":"&"}], "postprocess": id},
    {"name": "NonIdentElement", "symbols": ["Pseudo"], "postprocess": id},
    {"name": "Element", "symbols": ["Class"], "postprocess": id},
    {"name": "Element", "symbols": ["Id"], "postprocess": id},
    {"name": "Element", "symbols": ["Ident"], "postprocess": id},
    {"name": "Element", "symbols": ["Attr"], "postprocess": id},
    {"name": "Element", "symbols": [{"literal":"&"}], "postprocess": id},
    {"name": "Element", "symbols": ["Pseudo"], "postprocess": id},
    {"name": "Element", "symbols": [{"literal":"*"}], "postprocess": id},
    {"name": "Class", "symbols": [{"literal":"."}, "Ident"], "postprocess": d => '.' + d[1]},
    {"name": "Id", "symbols": [{"literal":"#"}, "Ident"], "postprocess": d => '#' + d[1]},
    {"name": "Combinator", "symbols": [{"literal":">"}], "postprocess": id},
    {"name": "Combinator", "symbols": [{"literal":"+"}], "postprocess": id},
    {"name": "Combinator", "symbols": [{"literal":"~"}], "postprocess": id},
    {"name": "Combinator", "symbols": [{"literal":"|"}], "postprocess": id},
    {"name": "Combinator$string$1", "symbols": [{"literal":">"}, {"literal":">"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "Combinator", "symbols": ["Combinator$string$1"], "postprocess": id},
    {"name": "Combinator$string$2", "symbols": [{"literal":"|"}, {"literal":"|"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "Combinator", "symbols": ["Combinator$string$2"], "postprocess": id},
    {"name": "Combinator$string$3", "symbols": [{"literal":">"}, {"literal":">"}, {"literal":">"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "Combinator", "symbols": ["Combinator$string$3"], "postprocess": id},
    {"name": "Attr$ebnf$1$subexpression$1$ebnf$1", "symbols": [/[|~*$^]/], "postprocess": id},
    {"name": "Attr$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Attr$ebnf$1$subexpression$1$subexpression$1", "symbols": ["Quoted"]},
    {"name": "Attr$ebnf$1$subexpression$1$subexpression$1$ebnf$1", "symbols": [/[^\]]/]},
    {"name": "Attr$ebnf$1$subexpression$1$subexpression$1$ebnf$1", "symbols": ["Attr$ebnf$1$subexpression$1$subexpression$1$ebnf$1", /[^\]]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Attr$ebnf$1$subexpression$1$subexpression$1", "symbols": ["Attr$ebnf$1$subexpression$1$subexpression$1$ebnf$1"]},
    {"name": "Attr$ebnf$1$subexpression$1", "symbols": ["Attr$ebnf$1$subexpression$1$ebnf$1", {"literal":"="}, "Attr$ebnf$1$subexpression$1$subexpression$1"]},
    {"name": "Attr$ebnf$1", "symbols": ["Attr$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Attr$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Attr$ebnf$2$subexpression$1", "symbols": ["_", {"literal":"i"}]},
    {"name": "Attr$ebnf$2", "symbols": ["Attr$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "Attr$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Attr", "symbols": [{"literal":"["}, "Ident", "Attr$ebnf$1", "Attr$ebnf$2", {"literal":"]"}], "postprocess": d => { return { type: 'Attribute', value: d.join('') } }},
    {"name": "Pseudo$ebnf$1", "symbols": [{"literal":":"}], "postprocess": id},
    {"name": "Pseudo$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Pseudo$ebnf$2$subexpression$1", "symbols": [{"literal":"("}, "PseudoArgs", {"literal":")"}]},
    {"name": "Pseudo$ebnf$2", "symbols": ["Pseudo$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "Pseudo$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Pseudo", "symbols": [{"literal":":"}, "Pseudo$ebnf$1", "Ident", "Pseudo$ebnf$2"], "postprocess":  
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
        	},
    {"name": "PseudoArgs$ebnf$1", "symbols": [{"literal":"!"}], "postprocess": id},
    {"name": "PseudoArgs$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "PseudoArgs", "symbols": ["PseudoArgs$ebnf$1", "Element"], "postprocess": d => { return d[0] ? '!' + d[1] : d[1] }},
    {"name": "PseudoArgs$subexpression$1", "symbols": ["__"]},
    {"name": "PseudoArgs$subexpression$1", "symbols": ["_", {"literal":","}, "_"]},
    {"name": "PseudoArgs$ebnf$2", "symbols": [{"literal":"!"}], "postprocess": id},
    {"name": "PseudoArgs$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "PseudoArgs", "symbols": ["PseudoArgs", "PseudoArgs$subexpression$1", "PseudoArgs$ebnf$2", "Element"], "postprocess": d => d[0].concat(d[1][1] ? [d[1][1], d[2] ? '!' + d[3] : d[3]] : d[2])},
    {"name": "ClassOrId", "symbols": ["Class"], "postprocess": id},
    {"name": "ClassOrId", "symbols": ["Id"], "postprocess": id},
    {"name": "Declaration", "symbols": ["Ident", "_", {"literal":":"}, "_", "Value"], "postprocess": 
              d => { 
                return {
                  type: 'Declaration',
                  name: d[0],
                  value: d[4]
                }
        }
        	  },
    {"name": "VariableDefinition", "symbols": ["Variable", "_", {"literal":":"}, "_", "VariableValue"], "postprocess":  
              d => {
                return { 
                  type: 'Declaration', 
                  name: d[0],
                  variable: true,
                  value: d[4] 
                }
        }
            },
    {"name": "VariableValue", "symbols": ["Value"]},
    {"name": "VariableValue", "symbols": ["DetachedRuleset"]},
    {"name": "DetachedRuleset", "symbols": ["Block"], "postprocess": d => { return { type: 'DetachedRuleset', ruleset: { type: 'Ruleset', rules: d[0] } }}},
    {"name": "Value$ebnf$1$subexpression$1$string$1", "symbols": [{"literal":"i"}, {"literal":"m"}, {"literal":"p"}, {"literal":"o"}, {"literal":"r"}, {"literal":"t"}, {"literal":"a"}, {"literal":"n"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "Value$ebnf$1$subexpression$1", "symbols": ["_", {"literal":"!"}, "_", "Value$ebnf$1$subexpression$1$string$1"]},
    {"name": "Value$ebnf$1", "symbols": ["Value$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Value$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Value", "symbols": ["ExpressionList", "Value$ebnf$1"], "postprocess": d => { return { type: 'Value', value: d[0], important: d[1] ? true : false } }},
    {"name": "ExpressionList", "symbols": ["Expression"], "postprocess": d => { return { type: 'Expression', value: d[0] }}},
    {"name": "ExpressionList", "symbols": ["ExpressionList", "_", {"literal":","}, "_", "Expression"], "postprocess": d => { return { type: 'Expression', value: d[0].concat([d[4]]) } }},
    {"name": "Expression$ebnf$1", "symbols": []},
    {"name": "Expression$ebnf$1$subexpression$1", "symbols": ["__", "Entity"]},
    {"name": "Expression$ebnf$1", "symbols": ["Expression$ebnf$1", "Expression$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Expression", "symbols": ["Entity", "Expression$ebnf$1"], "postprocess": d => d[1] ? [d[0]].concat(d[1][0]): [d[0]]},
    {"name": "Entity", "symbols": ["Comment"], "postprocess": id},
    {"name": "Entity", "symbols": ["Literal"], "postprocess": id},
    {"name": "Entity", "symbols": ["Url"], "postprocess": id},
    {"name": "Entity", "symbols": ["Keyword"], "postprocess": d => { return { type: 'Keyword', value: d[0]} }},
    {"name": "Entity", "symbols": [{"literal":"/"}], "postprocess": id},
    {"name": "Entity", "symbols": ["Javascript"], "postprocess": id},
    {"name": "Literal", "symbols": ["Quoted"]},
    {"name": "Literal", "symbols": ["UnicodeDescriptor"]},
    {"name": "ExpressionParts", "symbols": ["Unit"]},
    {"name": "ExpressionParts", "symbols": ["FunctionCall"]},
    {"name": "ExpressionParts", "symbols": ["Color"]},
    {"name": "ExpressionParts", "symbols": ["Variable"]},
    {"name": "ExpressionParts", "symbols": ["PropReference"]},
    {"name": "Quoted", "symbols": ["dqstring"]},
    {"name": "Quoted", "symbols": ["sqstring"]},
    {"name": "Num$ebnf$1$subexpression$1$ebnf$1", "symbols": ["Int"], "postprocess": id},
    {"name": "Num$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Num$ebnf$1$subexpression$1", "symbols": ["Num$ebnf$1$subexpression$1$ebnf$1", {"literal":"."}]},
    {"name": "Num$ebnf$1", "symbols": ["Num$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Num$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Num", "symbols": ["Num$ebnf$1", "Int"]},
    {"name": "Percentage", "symbols": ["Num", {"literal":"%"}]},
    {"name": "Dimension", "symbols": ["Num", "Ident"]},
    {"name": "Unit$ebnf$1$subexpression$1", "symbols": [{"literal":"%"}]},
    {"name": "Unit$ebnf$1$subexpression$1", "symbols": ["Ident"]},
    {"name": "Unit$ebnf$1", "symbols": ["Unit$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Unit$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Unit", "symbols": ["Num", "Unit$ebnf$1"]},
    {"name": "Keyword$ebnf$1", "symbols": []},
    {"name": "Keyword$ebnf$1", "symbols": ["Keyword$ebnf$1", "AlphaNumDash"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Keyword", "symbols": ["AlphaDash", "Keyword$ebnf$1"], "postprocess": d => d[0][0] + d[1].join('')},
    {"name": "FunctionCall$subexpression$1", "symbols": ["Ident"]},
    {"name": "FunctionCall$subexpression$1", "symbols": [{"literal":"%"}]},
    {"name": "FunctionCall", "symbols": ["FunctionCall$subexpression$1", {"literal":"("}, "Args", {"literal":")"}]},
    {"name": "Assignment", "symbols": ["Keyword", {"literal":"="}, "Value"]},
    {"name": "Url$string$1", "symbols": [{"literal":"u"}, {"literal":"r"}, {"literal":"l"}, {"literal":"("}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "Url$subexpression$1", "symbols": ["Quoted"]},
    {"name": "Url$subexpression$1$ebnf$1", "symbols": []},
    {"name": "Url$subexpression$1$ebnf$1", "symbols": ["Url$subexpression$1$ebnf$1", /[^)]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Url$subexpression$1", "symbols": ["Url$subexpression$1$ebnf$1"]},
    {"name": "Url", "symbols": ["Url$string$1", "_", "Url$subexpression$1", "_", {"literal":")"}]},
    {"name": "Prop", "symbols": ["PropReference"]},
    {"name": "Prop", "symbols": ["PropReferenceCurly"]},
    {"name": "Var", "symbols": ["Variable"]},
    {"name": "Var", "symbols": ["VariableCurly"]},
    {"name": "Interpolator", "symbols": ["VariableCurly"]},
    {"name": "Interpolator", "symbols": ["PropReferenceCurly"]},
    {"name": "PropReference", "symbols": [{"literal":"$"}, "LessIdent"]},
    {"name": "PropReferenceCurly$string$1", "symbols": [{"literal":"$"}, {"literal":"{"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "PropReferenceCurly", "symbols": ["PropReferenceCurly$string$1", "LessIdent", {"literal":"}"}]},
    {"name": "Variable$ebnf$1", "symbols": [{"literal":"@"}], "postprocess": id},
    {"name": "Variable$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Variable", "symbols": [{"literal":"@"}, "Variable$ebnf$1", "LessIdent"], "postprocess": d => d.join('')},
    {"name": "VariableCurly$string$1", "symbols": [{"literal":"@"}, {"literal":"{"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "VariableCurly", "symbols": ["VariableCurly$string$1", "LessIdent", {"literal":"}"}], "postprocess": d => d.join('')},
    {"name": "Color$ebnf$1", "symbols": ["Hex3"], "postprocess": id},
    {"name": "Color$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Color", "symbols": [{"literal":"#"}, "Hex3", "Color$ebnf$1"], "postprocess": d => d.join('')},
    {"name": "UnicodeDescriptor$string$1", "symbols": [{"literal":"U"}, {"literal":"+"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "UnicodeDescriptor$ebnf$1", "symbols": [/[0-9a-fA-F?]/]},
    {"name": "UnicodeDescriptor$ebnf$1", "symbols": ["UnicodeDescriptor$ebnf$1", /[0-9a-fA-F?]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "UnicodeDescriptor$ebnf$2$subexpression$1$ebnf$1", "symbols": [/[0-9a-fA-F?]/]},
    {"name": "UnicodeDescriptor$ebnf$2$subexpression$1$ebnf$1", "symbols": ["UnicodeDescriptor$ebnf$2$subexpression$1$ebnf$1", /[0-9a-fA-F?]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "UnicodeDescriptor$ebnf$2$subexpression$1", "symbols": [{"literal":"-"}, "UnicodeDescriptor$ebnf$2$subexpression$1$ebnf$1"]},
    {"name": "UnicodeDescriptor$ebnf$2", "symbols": ["UnicodeDescriptor$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "UnicodeDescriptor$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "UnicodeDescriptor", "symbols": ["UnicodeDescriptor$string$1", "UnicodeDescriptor$ebnf$1", "UnicodeDescriptor$ebnf$2"], "postprocess": d => d.join('')},
    {"name": "Javascript$ebnf$1", "symbols": [{"literal":"~"}], "postprocess": id},
    {"name": "Javascript$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Javascript$ebnf$2", "symbols": []},
    {"name": "Javascript$ebnf$2", "symbols": ["Javascript$ebnf$2", /[^`]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Javascript", "symbols": ["Javascript$ebnf$1", {"literal":"`"}, "Javascript$ebnf$2", {"literal":"`"}]},
    {"name": "MixinCall$ebnf$1$subexpression$1", "symbols": [{"literal":"("}, "_", "Args", "_", {"literal":")"}]},
    {"name": "MixinCall$ebnf$1", "symbols": ["MixinCall$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "MixinCall$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "MixinCall", "symbols": ["MixinSelectors", "MixinCall$ebnf$1"], "postprocess": d => [{ type: 'MixinCall', elements: d[0], params: d[1] ? d[1][2] : null }]},
    {"name": "MixinSelectors", "symbols": ["ClassOrId"], "postprocess": d => { return { type: 'Element', name: d[0] } }},
    {"name": "MixinSelectors$ebnf$1", "symbols": [{"literal":">"}], "postprocess": id},
    {"name": "MixinSelectors$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "MixinSelectors", "symbols": ["MixinSelectors", "_", "MixinSelectors$ebnf$1", "_", "ClassOrId"], "postprocess": d => d[0].concat([{ type: 'Element', name: d[0], combinator: '>' }])},
    {"name": "SemiArgValue", "symbols": ["Expression"]},
    {"name": "SemiArgValue", "symbols": ["DetachedRuleset"]},
    {"name": "CommaArgValue", "symbols": ["ExpressionList"], "postprocess": id},
    {"name": "CommaArgValue", "symbols": ["DetachedRuleset"], "postprocess": id},
    {"name": "_semi", "symbols": ["_", {"literal":";"}], "postprocess": d => null},
    {"name": "Args", "symbols": []},
    {"name": "Args$ebnf$1", "symbols": []},
    {"name": "Args$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "CommaArgValue"]},
    {"name": "Args$ebnf$1", "symbols": ["Args$ebnf$1", "Args$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Args", "symbols": ["CommaArgValue", "Args$ebnf$1"], "postprocess": 
        d => d
            },
    {"name": "Args$ebnf$2$subexpression$1", "symbols": ["_", "SemiArgValue"]},
    {"name": "Args$ebnf$2", "symbols": ["Args$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "Args$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Args$ebnf$3", "symbols": []},
    {"name": "Args$ebnf$3$subexpression$1", "symbols": ["_", {"literal":";"}, "_", "SemiArgValue"]},
    {"name": "Args$ebnf$3", "symbols": ["Args$ebnf$3", "Args$ebnf$3$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Args", "symbols": ["SemiArgValue", "_", {"literal":";"}, "Args$ebnf$2", "Args$ebnf$3"]},
    {"name": "Guard$string$1", "symbols": [{"literal":"w"}, {"literal":"h"}, {"literal":"e"}, {"literal":"n"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "Guard", "symbols": ["Guard$string$1", "_", "Condition"]},
    {"name": "Condition", "symbols": [{"literal":"6"}]},
    {"name": "Comment", "symbols": ["_", "Comment", "_"]},
    {"name": "Comment$string$1", "symbols": [{"literal":"/"}, {"literal":"/"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "Comment$ebnf$1", "symbols": []},
    {"name": "Comment$ebnf$1", "symbols": ["Comment$ebnf$1", /[^\n\r]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Comment", "symbols": ["Comment$string$1", "Comment$ebnf$1"]},
    {"name": "Comment$string$2", "symbols": [{"literal":"/"}, {"literal":"*"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "Comment$ebnf$2", "symbols": []},
    {"name": "Comment$ebnf$2", "symbols": ["Comment$ebnf$2", "CommentChars"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Comment$string$3", "symbols": [{"literal":"*"}, {"literal":"/"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "Comment", "symbols": ["Comment$string$2", "Comment$ebnf$2", "Comment$string$3"]},
    {"name": "CommentChars", "symbols": [{"literal":"*"}, /[^\/]/]},
    {"name": "CommentChars", "symbols": [/[^*]/]},
    {"name": "LessIdent$ebnf$1", "symbols": ["AlphaNumDash"]},
    {"name": "LessIdent$ebnf$1", "symbols": ["LessIdent$ebnf$1", "AlphaNumDash"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "LessIdent", "symbols": ["LessIdent$ebnf$1"], "postprocess": d => d[0].join('')},
    {"name": "Ident$ebnf$1", "symbols": []},
    {"name": "Ident$ebnf$1", "symbols": ["Ident$ebnf$1", "NameChar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Ident", "symbols": ["NameStart", "Ident$ebnf$1"], "postprocess": d => d[0] + d[1].join('')},
    {"name": "Op", "symbols": [{"literal":"*"}]},
    {"name": "Op", "symbols": [{"literal":"+"}]},
    {"name": "Op", "symbols": [{"literal":"-"}]},
    {"name": "Op", "symbols": [{"literal":"/"}]},
    {"name": "Op$string$1", "symbols": [{"literal":"."}, {"literal":"/"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "Op", "symbols": ["Op$string$1"]},
    {"name": "Int$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "Int$ebnf$1", "symbols": ["Int$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Int", "symbols": ["Int$ebnf$1"], "postprocess": d => d.join('')},
    {"name": "Hex3", "symbols": ["Hex", "Hex", "Hex"], "postprocess": d => d.join('')},
    {"name": "Hex", "symbols": [/[a-fA-F0-9]/]},
    {"name": "NameStart", "symbols": ["AlphaDash"]},
    {"name": "NameStart", "symbols": ["NonAscii"]},
    {"name": "NameStart", "symbols": ["Escape"]},
    {"name": "NameChar", "symbols": ["AlphaNumDash"]},
    {"name": "NameChar", "symbols": ["NonAscii"]},
    {"name": "NameChar", "symbols": ["Escape"]},
    {"name": "AlphaDash", "symbols": [/[a-zA-Z_-]/], "postprocess": d => d.join('')},
    {"name": "AlphaNumDash", "symbols": [/[A-Za-z0-9_-]/], "postprocess": d => d.join('')},
    {"name": "NonAscii", "symbols": [/[\u0080-\uD7FF\uE000-\uFFFD]/]},
    {"name": "Escape", "symbols": ["Unicode"]},
    {"name": "Escape", "symbols": [{"literal":"\\"}, /[\u0020-\u007E\u0080-\uD7FF\uE000-\uFFFD]/]},
    {"name": "Unicode$ebnf$1", "symbols": ["Hex"]},
    {"name": "Unicode$ebnf$1", "symbols": ["Unicode$ebnf$1", "Hex"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Unicode", "symbols": [{"literal":"\\"}, "Unicode$ebnf$1"]}
]
  , ParserStart: "Stylesheet"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
