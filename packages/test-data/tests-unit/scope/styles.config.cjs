module.exports = {
  compile: {
    // [jess R16] this fixture exercises the legacy Less caller-scope read
    // (a mixin/detached-ruleset body reading a caller-local variable), which is
    // OFF by default in jess v5; opt in so the fixture keeps its Less-4.x behavior.
    allowCallerScope: true
  }
};
