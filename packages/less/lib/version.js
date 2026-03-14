/**
 * Version info for Less.js v5 (Jess wrapper).
 * @module less/lib/version
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

/** @type {{ semver: string }} */
export const version = {
  semver: pkg.version || '5.0.0-alpha.0',
};

export default version;
