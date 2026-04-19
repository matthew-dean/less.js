const path = require('node:path');

function loadLessCompatPlugin() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
    path.resolve(process.cwd(), '../../..')
  ];
  try {
    const pkgJsonPath = require.resolve('@jesscss/plugin-less-compat/package.json', { paths: candidates });
    const mod = require(path.join(path.dirname(pkgJsonPath), 'lib/index.js'));
    return mod.lessCompatPlugin || mod.default || mod;
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') {
      return null;
    }
    throw error;
  }
}

const lessCompatPlugin = loadLessCompatPlugin();

module.exports = {
  ...(lessCompatPlugin ? {
    compile: {
      plugins: [lessCompatPlugin()]
    }
  } : {}),
  language: {
    less: {
      "syncImport": true
    }
  }
};
