!(function n(t, e, r) {
    function o(u, f) {
        if (!e[u]) {
            if (!t[u]) {
                var c = "function" == typeof require && require;
                if (!f && c) return c(u, !0);
                if (i) return i(u, !0);
                var s = new Error("Cannot find module '" + u + "'");
                throw ((s.code = "MODULE_NOT_FOUND"), s);
            }
            var l = (e[u] = { exports: {} });
            t[u][0].call(
                l.exports,
                function(n) {
                    var e = t[u][1][n];
                    return o(e ? e : n);
                },
                l,
                l.exports,
                n,
                t,
                e,
                r
            );
        }
        return e[u].exports;
    }
    for (
        var i = "function" == typeof require && require, u = 0;
        u < r.length;
        u++
    )
        o(r[u]);
    return o;
})(
    {
        1: [
            function(n, t, e) {
                "use strict";
                function r() {}
                function o(n) {
                    try {
                        return n.then;
                    } catch (t) {
                        return (d = t), w;
                    }
                }
                function i(n, t) {
                    try {
                        return n(t);
                    } catch (e) {
                        return (d = e), w;
                    }
                }
                function u(n, t, e) {
                    try {
                        n(t, e);
                    } catch (r) {
                        return (d = r), w;
                    }
                }
                function f(n) {
                    if ("object" != typeof this)
                        throw new TypeError(
                            "Promises must be constructed via new"
                        );
                    if ("function" != typeof n)
                        throw new TypeError("not a function");
                    (this._37 = 0),
                        (this._12 = null),
                        (this._59 = []),
                        n !== r && v(n, this);
                }
                function c(n, t, e) {
                    return new n.constructor(function(o, i) {
                        var u = new f(r);
                        u.then(o, i), s(n, new p(t, e, u));
                    });
                }
                function s(n, t) {
                    for (; 3 === n._37; ) n = n._12;
                    return 0 === n._37
                        ? void n._59.push(t)
                        : void y(function() {
                              var e =
                                  1 === n._37 ? t.onFulfilled : t.onRejected;
                              if (null === e)
                                  return void (1 === n._37
                                      ? l(t.promise, n._12)
                                      : a(t.promise, n._12));
                              var r = i(e, n._12);
                              r === w ? a(t.promise, d) : l(t.promise, r);
                          });
                }
                function l(n, t) {
                    if (t === n)
                        return a(
                            n,
                            new TypeError(
                                "A promise cannot be resolved with itself."
                            )
                        );
                    if (t && ("object" == typeof t || "function" == typeof t)) {
                        var e = o(t);
                        if (e === w) return a(n, d);
                        if (e === n.then && t instanceof f)
                            return (n._37 = 3), (n._12 = t), void h(n);
                        if ("function" == typeof e) return void v(e.bind(t), n);
                    }
                    (n._37 = 1), (n._12 = t), h(n);
                }
                function a(n, t) {
                    (n._37 = 2), (n._12 = t), h(n);
                }
                function h(n) {
                    for (var t = 0; t < n._59.length; t++) s(n, n._59[t]);
                    n._59 = null;
                }
                function p(n, t, e) {
                    (this.onFulfilled = "function" == typeof n ? n : null),
                        (this.onRejected = "function" == typeof t ? t : null),
                        (this.promise = e);
                }
                function v(n, t) {
                    var e = !1,
                        r = u(
                            n,
                            function(n) {
                                e || ((e = !0), l(t, n));
                            },
                            function(n) {
                                e || ((e = !0), a(t, n));
                            }
                        );
                    e || r !== w || ((e = !0), a(t, d));
                }
                var y = n("asap/raw"),
                    d = null,
                    w = {};
                (t.exports = f),
                    (f._99 = r),
                    (f.prototype.then = function(n, t) {
                        if (this.constructor !== f) return c(this, n, t);
                        var e = new f(r);
                        return s(this, new p(n, t, e)), e;
                    });
            },
            { "asap/raw": 4 }
        ],
        2: [
            function(n, t, e) {
                "use strict";
                function r(n) {
                    var t = new o(o._99);
                    return (t._37 = 1), (t._12 = n), t;
                }
                var o = n("./core.js");
                t.exports = o;
                var i = r(!0),
                    u = r(!1),
                    f = r(null),
                    c = r(void 0),
                    s = r(0),
                    l = r("");
                (o.resolve = function(n) {
                    if (n instanceof o) return n;
                    if (null === n) return f;
                    if (void 0 === n) return c;
                    if (n === !0) return i;
                    if (n === !1) return u;
                    if (0 === n) return s;
                    if ("" === n) return l;
                    if ("object" == typeof n || "function" == typeof n)
                        try {
                            var t = n.then;
                            if ("function" == typeof t) return new o(t.bind(n));
                        } catch (e) {
                            return new o(function(n, t) {
                                t(e);
                            });
                        }
                    return r(n);
                }),
                    (o.all = function(n) {
                        var t = Array.prototype.slice.call(n);
                        return new o(function(n, e) {
                            function r(u, f) {
                                if (
                                    f &&
                                    ("object" == typeof f ||
                                        "function" == typeof f)
                                ) {
                                    if (
                                        f instanceof o &&
                                        f.then === o.prototype.then
                                    ) {
                                        for (; 3 === f._37; ) f = f._12;
                                        return 1 === f._37
                                            ? r(u, f._12)
                                            : (2 === f._37 && e(f._12),
                                              void f.then(function(n) {
                                                  r(u, n);
                                              }, e));
                                    }
                                    var c = f.then;
                                    if ("function" == typeof c) {
                                        var s = new o(c.bind(f));
                                        return void s.then(function(n) {
                                            r(u, n);
                                        }, e);
                                    }
                                }
                                (t[u] = f), 0 === --i && n(t);
                            }
                            if (0 === t.length) return n([]);
                            for (var i = t.length, u = 0; u < t.length; u++)
                                r(u, t[u]);
                        });
                    }),
                    (o.reject = function(n) {
                        return new o(function(t, e) {
                            e(n);
                        });
                    }),
                    (o.race = function(n) {
                        return new o(function(t, e) {
                            n.forEach(function(n) {
                                o.resolve(n).then(t, e);
                            });
                        });
                    }),
                    (o.prototype["catch"] = function(n) {
                        return this.then(null, n);
                    });
            },
            { "./core.js": 1 }
        ],
        3: [
            function(n, t, e) {
                "use strict";
                function r() {
                    if (c.length) throw c.shift();
                }
                function o(n) {
                    var t;
                    (t = f.length ? f.pop() : new i()), (t.task = n), u(t);
                }
                function i() {
                    this.task = null;
                }
                var u = n("./raw"),
                    f = [],
                    c = [],
                    s = u.makeRequestCallFromTimer(r);
                (t.exports = o),
                    (i.prototype.call = function() {
                        try {
                            this.task.call();
                        } catch (n) {
                            o.onerror ? o.onerror(n) : (c.push(n), s());
                        } finally {
                            (this.task = null), (f[f.length] = this);
                        }
                    });
            },
            { "./raw": 4 }
        ],
        4: [
            function(n, t, e) {
                (function(n) {
                    "use strict";
                    function e(n) {
                        f.length || (u(), (c = !0)), (f[f.length] = n);
                    }
                    function r() {
                        for (; s < f.length; ) {
                            var n = s;
                            if (((s += 1), f[n].call(), s > l)) {
                                for (var t = 0, e = f.length - s; e > t; t++)
                                    f[t] = f[t + s];
                                (f.length -= s), (s = 0);
                            }
                        }
                        (f.length = 0), (s = 0), (c = !1);
                    }
                    function o(n) {
                        var t = 1,
                            e = new a(n),
                            r = document.createTextNode("");
                        return (
                            e.observe(r, { characterData: !0 }),
                            function() {
                                (t = -t), (r.data = t);
                            }
                        );
                    }
                    function i(n) {
                        return function() {
                            function t() {
                                clearTimeout(e), clearInterval(r), n();
                            }
                            var e = setTimeout(t, 0),
                                r = setInterval(t, 50);
                        };
                    }
                    t.exports = e;
                    var u,
                        f = [],
                        c = !1,
                        s = 0,
                        l = 1024,
                        a = n.MutationObserver || n.WebKitMutationObserver;
                    (u = "function" == typeof a ? o(r) : i(r)),
                        (e.requestFlush = u),
                        (e.makeRequestCallFromTimer = i);
                }.call(
                    this,
                    "undefined" != typeof global
                        ? global
                        : "undefined" != typeof self
                        ? self
                        : "undefined" != typeof window
                        ? window
                        : {}
                ));
            },
            {}
        ],
        5: [
            function(n, t, e) {
                "function" != typeof Promise.prototype.done &&
                    (Promise.prototype.done = function(n, t) {
                        var e = arguments.length
                            ? this.then.apply(this, arguments)
                            : this;
                        e.then(null, function(n) {
                            setTimeout(function() {
                                throw n;
                            }, 0);
                        });
                    });
            },
            {}
        ],
        6: [
            function(n, t, e) {
                n("asap");
                "undefined" == typeof Promise &&
                    ((Promise = n("./lib/core.js")),
                    n("./lib/es6-extensions.js")),
                    n("./polyfill-done.js");
            },
            {
                "./lib/core.js": 1,
                "./lib/es6-extensions.js": 2,
                "./polyfill-done.js": 5,
                asap: 3
            }
        ]
    },
    {},
    [6]
);
//# sourceMappingURL=/polyfills/promise-7.0.4.min.js.map
