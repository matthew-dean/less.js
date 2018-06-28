"use strict";

const Benchmark = require("benchmark");
const fs = require("fs");
const path = require("path");
const chevParse = require("../lib/less/parser/chev_css_parser").parseCss;
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
newSuite("10k pure CSS input")
  // The Chevrotain parser does not output any structure yet so the comparison is unfair.
  // Meaning that Chevrotain has unfair advantage in this benchmark.
  .add("Chevrotain", () => parseChevrotain(sample))
  .add("Less Parser", {
    defer: true,
    fn: function(deferred) {
      less.parse(sample, {}, function(err, root, imports, options) {
        if (err) {
          less.writeError(err);
          process.exit(3);
        }

        deferred.resolve();
      });
    }
  })
  .run({
    async: false
  });
