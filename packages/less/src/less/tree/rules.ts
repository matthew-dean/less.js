import Node from './node';

const Paren = function(node) {
    Node.call(this, node);
};

Paren.prototype = Object.assign(Object.create(Node.prototype), {
    type: 'Paren',

    genCSS(context, output) {
        output.add('(');
        this.value.genCSS(context, output);
        output.add(')');
    },

    eval(context) {
        return new Paren(this.value.eval(context));
    }
});

export default Paren;
