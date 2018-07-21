var ApiUtils = require('./api-utils'),
    AtRule = require('../tree/atrule');

module.exports = function () {
    var args = Array.prototype.slice.call(arguments);
    return ApiUtils.createFromParams(AtRule, args, ['name', 'value', 'rules']);
};
