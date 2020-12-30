import Node from './node';

const Rules = function(rules: Node[]) {
    Node.call(this, rules);
};

Rules.prototype = Object.assign(Object.create(Node.prototype), {
    type: 'Rules',

    genCSS(context, output) {
        output.add('{');
        this.value.genCSS(context, output);
        output.add('}');
    },

    eval(context) {
        return new Rules(this.value.eval(context));
    }
});

export default Paren;
