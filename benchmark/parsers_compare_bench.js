"use strict";

const nearley = require("nearley");
const grammar = require("../lib/less/parser/less_nearley_parser");
const Benchmark = require("benchmark");
const fs = require("fs");
const path = require("path");
const chevParse = require("../lib/less/parser/chev_css_parser").parseCss;
const pegParse = require("../lib/less/parser/less_peg_parser").parse;
const less = require("../lib/less-node");

const sample = fs
  .readFileSync(path.join(__dirname, "./samples/10k.css"), "utf8")
  .toString();

function newSuite(name) {
  return new Benchmark.Suite(name, {
    onStart: () => console.log(`\n\n${name}`),
    onCycle: event => console.log(String(event.target)),
    onComplete: function() {
      console.log("Fastest is " + this.filter("fastest").map("name"));
    }
  });
}

function parseChevrotain(text) {
  const parseResult = chevParse(sample);
  if (parseResult.lexErrors.length > 0 || parseResult.parseErrors.length > 0) {
    throw "Oops I did it again";
  }
}

const parseNearley = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

newSuite("10k pure CSS input")
  // The nearley parser fails
  // .add("Nearley", () => {
  //   parseNearley.feed(sample);
  // })
  .add("Peg", () => pegParse(sample))
  .add("Less Parser", {
    defer: true,
    fn: function(deferred) {
      const options = {};
      less.parse(sample, options, function(err, root, imports, options) {
        if (err) {
          less.writeError(err);
          process.exit(3);
        }

        deferred.resolve();
      });
    }
  })
  // The Chevrotain parser does not output any structure yet so the comparison is unfair.
  // Meaning that Chevrotain has unfair advantage in this benchmark.
  // Although creating the output structure is often very fast relative to parsing
  .add("Chevrotain", () => parseChevrotain(sample))
  .run({
    async: false
  });
