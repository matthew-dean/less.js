var ApiUtils = require('./api-utils'),
    Anonymous = require('../tree/anonymous');

module.exports = function () {
    var args = Array.prototype.slice.call(arguments);
    return ApiUtils.createFromParams(Anonymous, args, ['value']);
};
