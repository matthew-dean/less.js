export default {
  /**
   */
  getPath: function (filename) {},
  /**
   * Append a .less extension if appropriate. Only called if less thinks one could be added.
   * Provided by AbstractFileManager
  getPath: function (filename) {},
  /**
   * Provided by AbstractFileManager (returns false)
   * @returns {bool}
   */
  alwaysMakePathsAbsolute: function () {},
  /**
  tryAppendLessExtension: function (filename) {},
  /**
   * joins together 2 paths
   * Provided by AbstractFileManager
   * @param {string} basePath
   * @param {string} laterPath
   */
  alwaysMakePathsAbsolute: function () {},
  /**
   * @param {string} baseUrl
   * @returns {string}
   */
  pathDiff: function (url, baseUrl) {},
  /**
  isPathAbsolute: function (path) {},
  /**
   * @returns {bool}
   */
  supportsSync: function (filename, currentDirectory, options, environment) {},
  /**
   *
  join: function (basePath, laterPath) {},
  /**
  /**
   * Loads a file asynchronously. Expects a promise that either rejects with an error or fulfills with an
   * object containing
   *  { filename: - full resolved path to file
   *    contents: - the contents of the file, as a string }
   *
   * @param {string} filename
   * @param {string} currentDirectory
  pathDiff: function (url, baseUrl) {},
  /**
   *  { error: - error object if an error occurs
   *    filename: - full resolved path to file
   *    contents: - the contents of the file, as a string }
   *
   * @param {string} filename
   * @param {string} currentDirectory
   * @param {object} options
   * @param {less.environment.environment} environment
   * @returns {object} should be an object containing error or contents and filename
  supportsSync: function (filename, currentDirectory, options, environment) {},
  /**
  supports: function (filename, currentDirectory, options, environment) {},
  /**
  loadFile: function (filename, currentDirectory, options, environment) {},
  /**
  loadFileSync: function (filename, currentDirectory, options, environment) {}
