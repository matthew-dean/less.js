import environment from './environment';
import FileManager from './file-manager';
import UrlFileManager from './url-file-manager';
import createFromEnvironment from '../less';
const less = createFromEnvironment(environment, [new FileManager(), new UrlFileManager()]);
import lesscHelper from './lessc-helper';

/** 
 * Allows people to create less with their own environment
 *
 * @todo - Don't mutate the Less object. Find a better pattern
 *         to pass needed references. (More direct imports)
 */
less.createFromEnvironment = createFromEnvironment;
less.lesscHelper = lesscHelper;
less.PluginLoader = require('./plugin-loader').default;
less.fs = require('./fs').default;
less.FileManager = FileManager;
less.UrlFileManager = UrlFileManager;

// Set up options
less.options = require('../less/default-options').default();

// provide image-size functionality
require('./image-size').default(less.environment);

export default less;
