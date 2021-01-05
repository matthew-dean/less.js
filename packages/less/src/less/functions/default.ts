import { Bool } from '../tree';

const defaultFunc = {
    eval: function () {
        const v = this.value_;
        const e = this.error_;
        if (e) {
            throw e;
        }
        if (v != null) {
            return v ? new Bool(true) : new Bool(false);
        }
    },
    value: function (v) {
        this.value_ = v;
    },
    error: function (e) {
        this.error_ = e;
    },
    reset: function () {
        this.value_ = this.error_ = null;
    }
};

export default defaultFunc;
