# Less Alpha Tests

The alpha gate is intentionally split by contract:

- `lessc-alpha.mjs` owns CLI behavior, including Linecraft-formatted stderr.
  Default diagnostics must include color and source framing; `--no-color` must
  suppress terminal control sequences.
- `alpha-support.mjs` owns the supported public API surface and the unsupported
  alpha inventory.
- `alpha-fixtures.mjs` walks the upstream `tests-unit`, `tests-config`,
  `tests-error`, and `tests-warnings` folders. It classifies render parity,
  expected render gaps, forwarded Jess diagnostics, expected missing
  diagnostics, and warning gaps.
- `jess-alpha-fast-path.mjs` and the root publish checks own package assembly,
  optional peer behavior, and packed-consumer proof.
- `alpha-sourcemaps.mjs` owns source-map output.
- `test-es6.js` and `test-cjs.cjs` are the alpha Node module smoke tests.
  The historical broad Node harness remains under `test:legacy-node` while
  Less 4 parity-only surfaces such as remote imports and legacy plugin-host
  behavior are outside the alpha gate.

Do not grow `alpha-fixtures.mjs` into a second full test framework. Detailed
diagnostic, warning, CLI, and package-contract assertions belong in focused
tests. If those focused tests need cases, filtering, snapshots, hooks, or better
failure reporting, move them to a real test runner instead of expanding the
Node-script harness.

## Running against a local Jess build

The suite normally runs against the pinned Jess alpha. To measure an unreleased
Jess branch, build that Jess checkout (`pnpm install && pnpm run build:release`)
and point this package's `@jesscss/*` dependencies at it. Only `node_modules`
changes; `pnpm install --frozen-lockfile` restores the pins.

```sh
JESS=/path/to/jess
cd packages/less/node_modules/@jesscss
ln -sfn "$JESS/packages/compiler" compiler
ln -sfn "$JESS/packages/core" core
ln -sfn "$JESS/packages/syntax/less/jess-plugin-less" plugin-less
ln -sfn "$JESS/packages/syntax/less/jess-plugin-less-compat" plugin-less-compat
ln -sfn "$JESS/packages/jess-plugin-node-modules" plugin-node-modules
```

The optional `@jesscss/plugin-js` peer stays unlinked, as in a default install.
While linked, set `LESS_TEST_LINKED_JESS=1`: the `lessc-alpha.mjs` check that
the CLI resolves an installed `@jesscss/compiler/lib/index.js` would fail by
design (it resolves into the Jess checkout) and stop the script, so the variable
skips that one check. Linking `@jesscss/plugin-remote-import` the same way runs
the `--allow-remote-imports` checks against the plugin instead of its absence.
