import Node from './node';

const Assignment = function(key, val) {
    Node.call(this, [key, val]);
}

Assignment.prototype = Object.assign(Object.create(Node.prototype), {
    type: 'Assignment',

    accept(visitor) {
        this.value = visitor.visit(this.value);
    },

    eval(context) {
        if (this.value.eval) {
            return new Assignment(this.key, this.value.eval(context));
        }
        return this;
    },

    genCSS(context, output) {
        output.add(`${this.key}=`);
        if (this.value.genCSS) {
            this.value.genCSS(context, output);
        } else {
            output.add(this.value);
        }
    }
});

export default Assignment;
