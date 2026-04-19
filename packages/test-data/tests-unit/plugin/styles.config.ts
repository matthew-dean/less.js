import * as path from 'path';
import * as fs from 'fs';

// Resolve test data directory
// This file is at: less.js/packages/test-data/tests-unit/plugin/styles.config.ts
// Test data root is at: less.js/packages/test-data/
// We need to avoid import.meta and __dirname which don't work in cosmiconfig's sync loader
let testData: string;
let pluginDir: string;

try {
  // Try to use require.resolve (works in CommonJS contexts that cosmiconfig uses)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (typeof require !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    testData = path.dirname(require.resolve('@less/test-data'));
  } else {
    throw new Error('require not available');
  }
  pluginDir = path.join(testData, 'plugin');
} catch (e) {
  // Fallback: use a relative path approach
  // Since cosmiconfig loads this file, we can use the file's location
  // But we can't use __dirname or import.meta in the sync loader context
  // So we'll construct the path based on known structure
  // This file is in: packages/test-data/tests-unit/plugin/
  // Test data root is: packages/test-data/
  // We'll search up from process.cwd() or use a known pattern
  const possiblePaths = [
    path.resolve(process.cwd(), 'packages/test-data'),
    path.resolve(process.cwd(), '../../packages/test-data'),
    path.resolve(process.cwd(), '../../../packages/test-data')
  ];
  
  testData = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0]!;
  pluginDir = path.join(testData, 'plugin');
}

/**
 * Load Less.js plugins from the plugin directory.
 * These plugins use Less.js APIs and will work through the less-compat layer.
 */
function loadLessPlugins(): Record<string, any> {
  const pluginRegistry: Record<string, any> = {};
  const pluginFiles = [
    'plugin-global',
    'plugin-local',
    'plugin-simple',
    'plugin-preeval',
    'plugin-scope1',
    'plugin-scope2',
    'plugin-collection',
    'plugin-set-options',
    'plugin-set-options-v2',
    'plugin-set-options-v3',
    'plugin-transitive',
    'plugin-tree-nodes'
  ];

  pluginFiles.forEach((pluginName) => {
    const pluginPath = path.join(pluginDir, `${pluginName}.js`);
    if (fs.existsSync(pluginPath)) {
      try {
        // Load the Less.js plugin file
        // These use Less.js APIs like functions.addMultiple, registerPlugin, etc.
        // They'll work through the less-compat layer which provides a Less.js-compatible environment
        // Use require if available, otherwise this will fail and we'll use a stub
        let pluginModule: any;
        if (typeof require !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          pluginModule = require(pluginPath);
        } else {
          throw new Error('require not available in ES module context');
        }
        pluginRegistry[pluginName] = pluginModule.default || pluginModule;
      } catch (e) {
        // If loading fails, create a stub
        console.warn(`Failed to load plugin ${pluginName}:`, e);
        pluginRegistry[pluginName] = () => ({
          install() {
            // Stub
          }
        });
      }
    }
  });

  return pluginRegistry;
}

// Export the plugin registry for use by tests
// The test will instantiate lessCompatPlugin with this registry
export const pluginRegistry = loadLessPlugins();

export default {
  // Export plugin registry so tests can use it
  pluginRegistry,
  output: {
    collapseNesting: true
  }
};
