var ApiUtils = require('./api-utils'),
    Assignment = require('../tree/anonymous');

module.exports = function () {
    var args = Array.prototype.slice.call(arguments);
    return ApiUtils.createFromParams(Assignment, args, ['key','value']);
};
