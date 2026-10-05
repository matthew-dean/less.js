/**
 * Browser stub for `fs` / `node:fs` / `fs/promises`.
 *
 * The browser build has no file system: the entry fetches `@import`s over HTTP
 * through its own compiler plugin, which the compiler asks before any other.
 * What still reaches here is a file-reading function such as `data-uri()`, so
 * every method throws a clear message that surfaces as a normal render error
 * rather than a bundling gap.
 */

function unsupported() {
  throw new Error(
    'Less v5 browser build: reading files directly (e.g. data-uri()) is unsupported. '
    + 'Use the Node build (`less`) for file-reading functions.'
  );
}

// Named exports used across the jess runtime (readFile, readFileSync, etc.).
// A Proxy returns the same throwing function for any accessed property, so we
// don't have to enumerate the fs surface.
const handler = {
  get() {
    return unsupported;
  }
};

const fs = new Proxy({}, handler);

export default fs;
export const readFile = unsupported;
export const readFileSync = unsupported;
export const existsSync = unsupported;
export const promises = new Proxy({}, handler);
