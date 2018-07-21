var Node = require('../tree/node');

module.exports = {
    applyAndNew: function(constructor, args) {
        function partial() {
            return constructor.apply(this, args);
        };
        if (typeof constructor.prototype === "object") {
            partial.prototype = Object.create(constructor.prototype);
        }
        return partial;
    },
    createFromParams: function(nodeConstructor, args, keys) {
        var obj = args[0];
        var newArgs = [];
        var isApi = false;
        if (!(obj instanceof Node) &&
            obj instanceof Object) {
            isApi = true;
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (!(obj.hasOwnProperty(key))) {
                    isApi = false;
                    break;
                } else {
                    newArgs.push(obj[key]);
                }
            }
        }
        if (!isApi) {
            newArgs = args;
        }
        return new applyAndNew(nodeConstructor, newArgs);
    }
};