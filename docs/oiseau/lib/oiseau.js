/*
 * Oiseau
 *
 * Copyright (c) 2020 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
(function(root) {
    function isObject(obj) {
        return typeof obj === "object" && obj !== null;
    }

    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    function isInteger(x) {
        return typeof x === "number" && isFinite(x) && Math.floor(x) === x;
    }

    function deepCopy(obj) {
        var i,
            res;
        if(isArray(obj)) {
            res = [];
            for(i = 0; i < obj.length; i++) {
                res[i] = deepCopy(obj[i]);
            }
        } else if(isObject(obj)) {
            res = {};
            for(i in obj) {
                if(obj.hasOwnProperty(i)) {
                    res[i] = deepCopy(obj[i]);
                }
            }
        } else {
            res = obj;
        }
        return res;
    }

    function isEqual(obj1, obj2) {
        var i,
            result1,
            result2;

        if(isArray(obj1) && isArray(obj2)) {
            if(obj1.length !== obj2.length) {
                return false;
            } else {
                for(i = 0; i < obj1.length; i++) {
                    if(!isEqual(obj1[i], obj2[i])) {
                        return false;
                    }
                }
                return true;
            }
        } else if(isObject(obj1) && isObject(obj2)) {
            result1 = [];
            result2 = [];
            for(i in obj1) {
                if(obj1.hasOwnProperty(i)) {
                    result1.push(i);
                }
            }
            for(i in obj2) {
                if(obj2.hasOwnProperty(i)) {
                    result2.push(i);
                }
            }
            if(!isEqual(result1, result2)) {
                return false;
            }
            for(i = 0; i < result1.length; i++) {
                if(!isEqual(obj1[result1[i]], obj2[result1[i]])) {
                    return false;
                }
            }
            return true;
        } else {
            return obj1 === obj2;
        }
    }

    function makeEnv() {
        return function(name) {
            return false;
        };
    }

    function addEnv(name, env) {
        return function(nameToMatch) {
            return name === nameToMatch || env(nameToMatch);
        };
    }

    function Rena(option) {
        var optIgnore = option ? wrap(option.ignore) : null,
            optKeys = option ? option.keys : null,
            concatNotSkip = concat0(function(match, index) { return index; }),
            patternFloat = /[\+\-]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?:[eE][\+\-]?[0-9]+)?/,
            me;

        function wrap(anObject) {
            var regex,
                reSource,
                reFlags = "g";

            if(typeof anObject === "string") {
                return function(match, index, attr) {
                    if(anObject === match.substring(index, index + anObject.length)) {
                        return {
                            match: anObject,
                            lastIndex: index + anObject.length,
                            attr: attr
                        };
                    } else {
                        return null;
                    }
                };
            } else if(anObject instanceof RegExp) {
                reSource = anObject.source;
                reFlags += anObject.ignoreCase ? "i" : "";
                reFlags += anObject.multiline ? "m" : "";
                regex = new RegExp(reSource, reFlags);
                return function(match, lastindex, attr) {
                    var match;
                    regex.lastIndex = 0;
                    if(!!(match = regex.exec(match.substring(lastindex))) && match.index === 0) {
                        return {
                            match: match[0],
                            lastIndex: lastindex + regex.lastIndex,
                            attr: attr
                        };
                    } else {
                        return null;
                    }
                };
            } else {
                return anObject;
            }
        }

        function wrapObjects(objects) {
            var result = [], i;

            for(i = 0; i < objects.length; i++) {
                result.push(wrap(objects[i]));
            }
            return result;
        }

        function defaultSkipSpace(match, index) {
            var result;

            if(!optIgnore || !(result = optIgnore(match, index, null))) {
                return index;
            } else {
                return result.lastIndex;
            }
        }

        function concat0(skipSpace) {
            return function(/* args */) {
                var args = wrapObjects(Array.prototype.slice.call(arguments));

                return function(match, index, attr) {
                    var indexNew = index,
                        attrNew = attr,
                        result,
                        i;

                    for(i = 0; i < args.length; i++) {
                        result = args[i](match, indexNew, attrNew);
                        if(result) {
                            indexNew = skipSpace(match, result.lastIndex);
                            attrNew = result.attr;
                        } else {
                            return null;
                        }
                    }
                    return {
                        match: match.substring(index, indexNew),
                        lastIndex: indexNew,
                        attr: attrNew
                    };
                };
            };
        }

        me = {
            isEnd: function() {
                return function(match, index, attr) {
                    if(index >= match.length) {
                        return {
                            match: "",
                            lastIndex: index,
                            attr: attr
                        };
                    } else {
                        return null;
                    }
                };
            },

            concat: concat0(defaultSkipSpace),

            choice: function(/* args */) {
                var args = wrapObjects(Array.prototype.slice.call(arguments));

                return function(match, index, attr) {
                    var result, i;

                    for(i = 0; i < args.length; i++) {
                        result = args[i](match, index, attr);
                        if(result) {
                            return result;
                        }
                    }
                    return null;
                };
            },

            action: function(exp, action) {
                var wrapped = wrap(exp);

                return function(match, index, attr) {
                    var result = wrapped(match, index, attr);

                    if(result) {
                        return {
                            match: result.match,
                            lastIndex: result.lastIndex,
                            attr: action(result.match, result.attr, attr)
                        };
                    } else {
                        return null;
                    }
                };
            },

            lookaheadNot: function(exp) {
                var wrapped = wrap(exp);

                return function(match, index, attr) {
                    var result = wrapped(match, index, attr);

                    if(result) {
                        return null;
                    } else {
                        return {
                            match: "",
                            lastIndex: index,
                            attr: attr
                        };
                    }
                };
            },

            letrec: function(/* args */) {
                var l = Array.prototype.slice.call(arguments),
                    delays = [],
                    memo = [],
                    i;

                for(i = 0; i < l.length; i++) {
                    (function(i) {
                        delays.push(function(match, index, attr) {
                            if(!memo[i]) {
                                memo[i] = l[i].apply(null, delays);
                            }
                            return memo[i](match, index, attr);
                        });
                    })(i);
                }
                return delays[0];
            },

            zeroOrMore: function(exp) {
                return me.letrec(function(y) {
                    return me.choice(me.concat(exp, y), "");
                });
            },

            oneOrMore: function(exp) {
                return me.concat(exp, me.zeroOrMore(exp));
            },

            opt: function(exp) {
                return me.choice(exp, "");
            },

            lookahead: function(exp) {
                return me.lookaheadNot(me.lookaheadNot(exp));
            },

            attr: function(val) {
                return me.action("", function() { return val; });
            },

            real: function(val) {
                return me.action(patternFloat, function(match) { return parseFloat(match); });
            },

            key: function(key) {
                var skipKeys = [],
                    i;

                if(!optKeys) {
                    throw new Error("Fatal: keys are not set");
                }
                for(i = 0; i < optKeys.length; i++) {
                    if(key.length < optKeys[i] && key === optKeys[i].substring(0, key.length)) {
                        skipKeys.push(optKeys[i]);
                    }
                }
                return me.concat(me.lookaheadNot(me.choice.apply(null, skipKeys)), key);
            },

            notKey: function() {
                if(!optKeys) {
                    throw new Error("Fatal: keys are not set");
                }
                return me.lookaheadNot(me.choice.apply(null, optKeys));
            },

            equalsId: function(key) {
                if(!optIgnore && !optKeys) {
                    return wrap(key);
                } else if(optIgnore && !optKeys) {
                    return concatNotSkip(key, me.choice(me.isEnd(), me.lookahead(optIgnore)));
                } else if(optKeys && !optIgnore) {
                    return concatNotSkip(key, me.choice(me.isEnd(), me.lookaheadNot(me.notKey())));
                } else {
                    return concatNotSkip(key, me.choice(me.isEnd(), me.lookahead(optIgnore), me.lookaheadNot(me.notKey())));
                }
            }
        };
        return me;
    }

    function Lambda(option) {
        var opt = option ? option : {};
        var log = opt.log ? opt.log : console.log;
        var maxIteration = opt.iteration ? opt.iteration : 2500;
        var maxnum = opt.maxNumber ? opt.maxNumber : 256;
        var count = 1;
        var r = Rena({ ignore: /[ \t]+/ });
        var parser = r.letrec(
            function(exprlist, expr, lambda) {
                return r.concat(
                    r.attr(null),
                    r.oneOrMore(
                        r.action(expr, function(match, syn, inh) {
                            return inh === null ? syn : [inh].concat([syn]);
                        })));
            },

            function(exprlist, expr, lambda) {
                return r.choice(
                    r.concat("(", exprlist, ")"),
                    lambda,
                    r.action(/[a-z][0-9]*/, function(match, syn, inh) {
                        return match;
                    }),

                    r.action(/[A-Z]([0-9]+|\*+)?/, function(match, syn, inh) {
                        if(!macroEnv[match]) {
                            throw new Error("Oiseau: Macro not defined: " + match);
                        }
                        return substMacro(macroEnv[match]);
                    }),

                    r.action(/\[[^\[\]\=]+\]/, function(match, syn, inh) {
                        var name = match.substring(1, match.length - 1);

                        if(!macroEnv[name]) {
                            throw new Error("Oiseau: Macro not defined: " + name);
                        }
                        return substMacro(macroEnv[name]);
                    }),

                    r.action(/<[^>]+>/, function(match, syn, inh) {
                        return substMacro({
                            "function": {
                                args: "x",
                                begin: [["print", { "q": match.substring(1, match.length - 1) }], "x"]
                            }
                        });
                    }),

                    r.concat(
                        "[[",
                        r.attr([]),
                        r.oneOrMore(
                            r.action(expr, function(match, syn, inh) {
                                return inh.concat([syn]);
                            })),
                        r.choice(
                            r.concat(
                                "|",
                                r.action(expr, function(match, syn, inh) {
                                    return makeList(inh, syn);
                                })),
                            r.action("", function(match, syn, inh) {
                                return makeList(inh, substMacro(objFalse));
                            })),
                        "]]"),

                    r.action(/[0-9]+/, function(match, syn, inh) {
                        var num = parseFloat(match),
                            i,
                            funcarg = "v#" + (count++),
                            xarg = "v#" + (count++),
                            result = xarg;

                        if(!isInteger(num) || num > maxnum) {
                            throw new Error("Oiseau: Number too big");
                        }
                        for(i = 0; i < num; i++) {
                            result = [funcarg, result];
                        }
                        return {
                            "function": {
                                "args": [funcarg],
                                "begin": [
                                    {
                                        "function": {
                                            "args": [xarg],
                                            "begin": [result]
                                        }
                                    }
                                ]
                            }
                        };
                    })
                );
            },

            function(exprlist, expr, lambda) {
                return r.concat(
                    r.choice("^", "λ"),
                    r.concat(
                        r.attr([]),
                        r.oneOrMore(
                            r.action(
                                /[a-z][0-9]*/, function(match, syn, inh) {
                                    return inh.concat([match]);
                                }))),
                    ".",
                    r.action(exprlist, function(match, syn, inh) {
                        var subst;

                        subst = currying(inh, [syn], 0);
                        return substMacro(subst);
                    }))
            });

        var macroEnv = {};
        var macro = r.concat(
            r.choice(
                r.action(/[^\[\]\=\s]+/, function(match, syn, inh) {
                    return match;
                }),
                r.action(/\[[^\[\]\=]+\]/, function(match, syn, inh) {
                    return match.substring(1, match.length - 1);
                })
            ),
            r.opt(":"),
            r.concat("=", r.lookaheadNot("=")),
            r.action(parser, function(match, syn, inh) {
                if(macroEnv[inh]) {
                    throw new Error("Oiseau: Macro has already defined: " + inh);
                }
                macroEnv[inh] = syn;
            }));

        var equivalent = r.concat(
            parser,
            "==",
            r.action(parser, function(match, syn, inh) {
                return isEquivalent(syn, inh);
            }));

        var evalParser = r.choice(
            r.concat(
                "``",
                r.action(parser, function(match, syn, inh) {
                    evalJsonNonstrict(syn);
                    return objTrue;
                })),
            r.concat(
                "`",
                r.action(parser, function(match, syn, inh) {
                    evalJsonStrict(syn);
                    return objTrue;
                }))
            );

        var transformTParser = r.concat(
            "@",
            r.action(parser, function(match, syn, inh) {
                log(serializeSKI(transformT(betaTransformAll(syn))));
                return objTrue;
            })
        );

        var allParser = r.concat(
            r.zeroOrMore(r.concat(macro, /\r\n|\r|\n/)),
            r.choice(
                r.action(equivalent, function(match, syn, inh) {
                    if(syn) {
                        return substDemacro(objTrue);
                    } else {
                        return substDemacro(objFalse);
                    }
                }),
                r.action(evalParser, function(match, syn, inh) {
                    return substDemacro(syn);
                }),
                r.action(transformTParser, function(match, syn, inh) {
                    return substDemacro(syn);
                }),
                r.action(parser, function(match, syn, inh) {
                    return substDemacro(betaTransformAll(syn));
                })
            )
        );

        function isEquivalent(func1, func2) {
            var normalized1 = substNormalize(betaTransformAll(func1)),
                normalized2 = substNormalize(betaTransformAll(func2));

            return isEqual(normalized1, normalized2);
        }

        function makeList(anArray, objNil) {
            function make(i) {
                if(i < anArray.length) {
                    return [[substMacro(cons), anArray[i]], make(i + 1)];
                } else {
                    return objNil;
                }
            }
            return make(0);
        }

        function currying(args, body, i) {
            if(i < args.length - 1) {
                return {
                    "function": {
                        args: [args[i]],
                        begin: [currying(args, body, i + 1)]
                    }
                };
            } else {
                return {
                    "function": {
                        args: [args[i]],
                        begin: body
                    }
                };
            }
        }

        function substMacro(body, varNameBuilder) {
            var substVars = {},
                varNameBld = varNameBuilder ? varNameBuilder : defaultVarName;

            function defaultVarName() {
                return "v#" + count++;
            }

            function subst(body) {
                var varName,
                    result = [],
                    i;

                if(body["function"]) {
                    varName = varNameBld();
                    substVars[body["function"].args[0]] = varName;
                    return {
                        "function": {
                            args: [varName],
                            begin: subst(body["function"].begin)
                        }
                    };
                } else if(typeof body === "string") {
                    if(substVars[body]) {
                        return substVars[body];
                    } else {
                        return body;
                    }
                } else if(isArray(body)) {
                    for(i = 0; i < body.length; i++) {
                        result.push(subst(body[i]));
                    }
                    return result;
                } else {
                    return body;
                }
            }
            return subst(body);
        }

        function substDemacro(body) {
            var freeVars = [],
                count = "a".charCodeAt(0),
                countEnd = "z".charCodeAt(0) + 1;

            function collectFreeVariable(body) {
                var i;

                if(isArray(body)) {
                    for(i = 0; i < body.length; i++) {
                        collectFreeVariable(body[i]);
                    }
                } else if(body["function"]) {
                    collectFreeVariable(body["function"]["begin"]);
                } else if(typeof body === "string" && body.length === 1) {
                    freeVars[body.charCodeAt(0)] = 1;
                } else if(typeof body === "string" && /a[0-9]+/.test(body)) {
                    freeVars[parseInt(body.substring(1, body.length)) + countEnd] = 1;
                }
            }

            function varNameBuilder() {
                var result;

                for(; freeVars[count]; count++) {}
                if(count < countEnd) {
                    result = String.fromCharCode(count);
                } else {
                    result = "a" + (count - countEnd);
                }
                count++;
                return result;
            }

            freeVars[countEnd] = 1;
            collectFreeVariable(body);
            return substMacro(body, varNameBuilder);
        }

        function substNormalize(body) {
            var count = 1;

            function varNameBuilder() {
                return "v#" + (count++);
            }
            return substMacro(body, varNameBuilder);
        }

        function defmacro(def) {
            if(!macro(def, 0, 0)) {
                throw new Error("Fatal: Internal Error");
            }
        }

        if(!isInteger(maxnum) || maxnum < 0) {
            throw new Error("Oiseau: Invalid max number");
        }

        defmacro("S = ^xyz.xz(yz)");
        defmacro("K = ^xy.x");
        defmacro("I = ^x.x");
        defmacro("T = ^xy.x");
        defmacro("F = ^xy.y");
        defmacro("Cons = ^cdf.fcd");
        defmacro("Car = ^p.pT");
        defmacro("Cdr = ^p.pF");
        defmacro("Isnil = ^x.x(^abc.F)T");
        var cons = macroEnv["Cons"];
        var objTrue = macroEnv["T"];
        var objFalse = macroEnv["F"];

        function betaTransformAll(func) {
            var before,
                after = func,
                i = 0;

            do {
                before = after;
                after = betaTransformAll1(after);
                if(i++ >= maxIteration) {
                    throw new Error("Oiseau: Max iteration exceeded: Maybe infinite loop");
                }
            } while(!isEqual(before, after));
            return after;
        }

        function betaTransformAll1(func) {
            var i,
                result;

            if(isArray(func)) {
                if(func[0] === "print") {
                    return func;
                } else if(func[0]["function"]) {
                    return betaTransform(func[0], betaTransformAll1(func[1]));
                } else {
                    return [betaTransformAll1(func[0]), betaTransformAll1(func[1])];
                }
            } else if(func["function"]) {
                for(i = 0; i < func["function"]["begin"].length; i++) {
                    result = betaTransformAll1(func["function"]["begin"][i]);
                }
                return {
                    "function": {
                        args: [func["function"].args[0]],
                        begin: [result]
                    }
                };
            } else {
                return func;
            }
        }

        function betaTransform(func, arg) {
            var i,
                result;

            function betaTrans(func, arg, name) {
                var i,
                    result;

                if(isArray(func)) {
                    if(func[0] === "print") {
                        return func;
                    } else {
                        return [betaTrans(func[0], arg, name), betaTrans(func[1], arg, name)];
                    }
                } else if(func["function"]) {
                    for(i = 0; i < func["function"]["begin"].length; i++) {
                        result = betaTrans(func["function"]["begin"][i], arg, name);
                    }
                    return {
                        "function": {
                            args: [func["function"].args[0]],
                            begin: [result]
                        }
                    };
                } else if(func === name) {
                    return arg;
                } else {
                    return func;
                }
            }

            if(func["function"]) {
                for(i = 0; i < func["function"]["begin"].length; i++) {
                    result = betaTrans(func["function"]["begin"][i], arg, func["function"].args[0]);
                }
                return result;
            } else {
                return func;
            }
        }

        function serializeJson(json) {
            var result = "",
                varnames = "",
                beginClause;

            function jsonarg(arg) {
                if(isArray(arg)) {
                    result += "(" + serializeJson(arg) + ")";
                } else {
                    result += arg;
                }
            }

            if(isArray(json)) {
                if(typeof json[1] === "string") {
                    result = serializeJson(json[0]) + json[1];
                } else if(!isArray(json[1])) {
                    result = serializeJson(json[0]) + "(" + serializeJson(json[1]) + ")";
                } else {
                    result = serializeJson(json[0]);
                    jsonarg(json[1]);
                }
            } else if(json["function"]) {
                varnames = json["function"].args[0];
                beginClause = json["function"]["begin"][0];
                for(; beginClause["function"]; beginClause = beginClause["function"]["begin"][0]) {
                    varnames += beginClause["function"].args[0];
                }
                result += "^" + varnames + "." + serializeJson(beginClause);
            } else {
                result += json;
            }
            return result;
        }

        function evalJson(json, delay, force) {
            function evalJson1(json, env) {
                if(isArray(json)) {
                    if(json[0] === "print") {
                        log(json[1].q);
                        return null;
                    } else {
                        return (force(evalJson1(json[0], env)))(delay(evalJson1, json[1], env));
                    }
                } else if(json["function"]) {
                    return closure(json["function"]["begin"], json["function"].args[0], env);
                } else if(typeof json === "string") {
                    return force(env(json));
                } else {
                    throw new Error("Fatal: Internal Error");
                }
            }

            function closure(body, name, env) {
                return function(arg) {
                    var i,
                        result,
                        envnew = createEnv(env, name, arg);

                    for(i = 0; i < body.length; i++) {
                        result = evalJson1(body[i], envnew);
                    }
                    if(!result) {
                        throw new Error("Fatal: Internal Error");
                    }
                    return result;
                };
            }

            function createEnv(env, bound, arg) {
                return function(name) {
                    return name === bound ? arg : env(name);
                };
            }

            return evalJson1(json, function(name) {
                throw new Error("Oiseau: Variable is not bound: " + name);
            });
        }

        function evalJsonNonstrict(json) {
            function Delay(value) {
                this.value = value;
            }

            function delay(evalfunc, value, env) {
                return new Delay(function() {
                    return evalfunc(value, env);
                });
            }

            function force(value) {
                var result = value;

                while(result instanceof Delay) {
                    result = result.value();
                }
                return result;
            }
            return evalJson(json, delay, force);
        }

        function evalJsonStrict(json) {
            function delay(evalfunc, value, env) {
                return evalfunc(value, env);
            }

            function force(value) {
                return value;
            }
            return evalJson(json, delay, force);
        }

        function checkFree(obj, bound) {
            function walk(obj, env) {
                if(obj["function"]) {
                    return walk(obj["function"]["begin"][0], addEnv(obj["function"]["args"][0], env));
                } else if(obj["combi"]) {
                    return walk(obj.combi, env) || walk(obj.apply, env);
                } else if(isArray(obj)) {
                    return walk(obj[0], env) || walk(obj[1], env);
                } else if(env(obj)) {
                    return true;
                } else if(typeof obj === "string") {
                    return false;
                }
            }
            return walk(obj, addEnv(bound, makeEnv()));
        }

        function transformT(obj) {
            var arg,
                body;

            if(typeof obj === "string") {
                return obj;
            } else if(isArray(obj)) {
                return {
                    "combi": transformT(obj[0]),
                    "apply": transformT(obj[1])
                };
            } else if(obj["combi"]) {
                return {
                    "combi": transformT(obj.combi),
                    "apply": transformT(obj.apply)
                };
            } else if(obj["function"]) {
                arg = obj["function"]["args"][0];
                body = obj["function"]["begin"][0];
                if(arg === body) {
                    return "I";
                } else if(!checkFree(body, arg)) {
                    return {
                        "combi": "K",
                        "apply": transformT(body)
                    };
                } else if(body["function"]) {
                    return transformT({
                        "function": {
                            "args": [arg],
                            "begin": [transformT(body)]
                        }
                    });
                } else if(isArray(body)) {
                    if(!checkFree(body[0], arg) && arg === body[1]) {
                        return transformT(body[0]);
                    } else {
                        return {
                            "combi": {
                                "combi": "S",
                                "apply": transformT({
                                    "function": {
                                        "args": [arg],
                                        "begin": [body[0]]
                                    }
                                })
                            },
                            "apply": transformT({
                                "function": {
                                    "args": [arg],
                                    "begin": [body[1]]
                                }
                            })
                        };
                    }
                } else if(body["combi"]) {
                    if(!checkFree(body.combi, arg) && arg === body.apply) {
                        return transformT(body.combi);
                    } else {
                        return {
                            "combi": {
                                "combi": "S",
                                "apply": transformT({
                                    "function": {
                                        "args": [arg],
                                        "begin": [body.combi]
                                    }
                                })
                            },
                            "apply": transformT({
                                "function": {
                                    "args": [arg],
                                    "begin": [body.apply]
                                }
                            })
                        };
                    }
                } else {
                    console.log(JSON.stringify(body));
                    throw new Error("Internal Error");
                }
            } else {
                console.log(JSON.stringify(obj));
                throw new Error("Internal Error");
            }
        }

        function serializeSKI(obj) {
            if(!isObject(obj)) {
                return obj;
            } else if(isObject(obj.apply)) {
                return serializeSKI(obj.combi) + "(" + serializeSKI(obj.apply) + ")";
            } else {
                return serializeSKI(obj.combi) + obj.apply;
            }
        }

        return {
            serialize: function(json) {
                return serializeJson(substDemacro(json));
            },

            oneline: function(prog) {
                var result;

                if(/^@/.test(prog)) {
                    result = parser(prog, 1, []);
                    log(serializeSKI(transformT(betaTransformAll(result.attr))));
                    return objTrue;
                } else if(!!(result = macro(prog, 0, []))) {
                    log("Macro Defined.");
                    return objTrue;
                } else if(!!(result = equivalent(prog, 0, []))) {
                    return result.attr ? objTrue : objFalse;
                } else if(!!(result = evalParser(prog, 0, []))) {
                    return objTrue;
                } else if(!!(result = parser(prog, 0, []))) {
                    return betaTransformAll(result.attr);
                } else {
                    throw new Error("Oiseau: Syntax error");
                }
            },

            browser: function(prog) {
                var result = allParser(prog, 0, []);
                if(result) {
                    return serializeJson(betaTransformAll(result.attr));
                } else {
                    throw new Error("Oiseau: Syntax error");
                }
            }
        };
    }

    if(typeof module !== "undefined" && module.exports) {
        module.exports = Lambda;
    } else {
        root["Oiseau"] = Lambda;
    }
})(this);

