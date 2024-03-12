/*
 * epee
 *
 * Copyright (c) 2022 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
(function(root) {
    class MyError extends Error {

        constructor(message) {
            super(message);
        }

    }

    function BigIntLib(opt) {
        const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);
        const randomGenerator = opt && opt.random ? opt.random() : (function*() {
            while(true) {
                yield Math.random();
            }
        })();
        const log = opt && opt.log ? opt.log : x => {};

        function wrap(value) {
            if(typeof value === "bigint") {
                return value;
            } else if(typeof value === "number" && Number.isSafeInteger(value)) {
                return BigInt(value);
            } else {
                throw new Error("Invalid argument: " + value);
            }
        }

        function* gcdstep(value1, value2) {
            let v1 = me.max(value1, value2);
            let v2 = me.min(value1, value2);

            while(v2 > 0n) {
                const k = v1 / v2;
                const r = v1 % v2;

                yield k;
                v1 = v2;
                v2 = r;
            }
            yield v1;
        }

        function modPowBase(value, exp, modulo, test) {
            const m = wrap(modulo);
            let n = wrap(exp);
            let a = 1n;
            let b = wrap(value);

            while(true) {
                if(n === 0n) {
                    return a;
                } else if(n % 2n === 0n) {
                    const tb = test(b, m);

                    b = (tb * tb) % m;
                    n /= 2n;
                } else {
                    a = (a * b) % m;
                    n--;
                }
            }
        }

        function random0To1(n) {
            if(n <= MAX_SAFE_INTEGER) {
                return BigInt(Math.floor(randomGenerator.next().value * Number(n)));
            } else {
                const denom = MAX_SAFE_INTEGER;
                const numer = random0To1(MAX_SAFE_INTEGER);

                return n * numer / denom;
            }
        }

        function primeByMillerRabinTest(value, certainty) {
            const n = wrap(value);

            function test() {
                function trivialTest(r, m) {
                    if(r === 1n || r === m - 1n) {
                        return r;
                    } else if((r * r) % m === 1n) {
                        return 0n;
                    } else {
                        return r;
                    }
                }

                function tryIt(a) {
                    return modPowBase(a, n - 1n, n, trivialTest) === 1n;
                }
                return tryIt(1n + random0To1(n - 1n));
            }

            if(typeof certainty !== "number" || certainty < 1 || !Number.isSafeInteger(certainty)) {
                throw new Error("Certainty must be Positive Number: " + certainty);
            }

            for(let i = 0; i < certainty; i++) {
                if(!test()) {
                    return false;
                }
            }
            return true;
        }

        function sqrt(number) {
            function toList(num) {
                const result = [];

                for(let v = num; v !== 0n; v = v / 10n) {
                    result.push(Number(v % 10n));
                }
                return result;
            }

            function toBigInt(list) {
                let result = 0n;

                for(let i = list.length - 1; i >= 0; i--) {
                    result = result * 10n + BigInt(list[i]);
                }
                return result;
            }

            const numlist = toList(number);
            let right = null;
            let root = null;
            let left = null;

            if(numlist.length === 0) {
                return 0n;
            }

            for(let i = Math.floor((numlist.length - 1) / 2) * 2; i >= 0; i -= 2) {
                if(right === null) {
                    const init = i + 1 < numlist.length
                                 ? numlist[i] + numlist[i + 1] * 10
                                 : numlist[i];
                    const initroot = Math.floor(Math.sqrt(init));

                    root = [initroot];
                    right = init - initroot * initroot > 0 ? [init - initroot * initroot] : [];
                    left = [initroot * 2];
                    log("1");
                } else {
                    let left1;

                    right = numlist.slice(i, i + 2).concat(right);
                    for(j = 1; true; j++) {
                        if(j === 10) {
                            log("2");
                            j--;
                            break;
                        }
                        left1 = [j].concat(left);
                        if(toBigInt(right) < toBigInt(left1) * BigInt(j)) {
                            log("3");
                            j--;
                            break;
                        }
                    }
                    root = [j].concat(root);
                    left1 = [j].concat(left);
                    right = toList(toBigInt(right) - toBigInt(left1) * BigInt(j));
                    left = toList(toBigInt(left1) + BigInt(j));
                }
            }
            return right.length === 0 ? toBigInt(root) : false;
        };

        const me = {
            abs: function(x) {
                return x < 0n ? -x : x;
            },

            max: function(...values) {
                return values.map(wrap).reduce((p, c) => p > c ? p : c);
            },

            min: function(...values) {
                return values.map(wrap).reduce((p, c) => p < c ? p : c);
            },

            gcd: function(value1, value2) {
                const v1 = me.max(value1, value2);
                const v2 = me.min(value1, value2);
                let now, result;

                if(v1 <= 0n) {
                    throw new Error("Value must be positive: " + v1);
                } else if(v2 <= 0n) {
                    throw new Error("Value must be positive: " + v2);
                }
                for(const gg = gcdstep(v1, v2); !(now = gg.next()).done; result = now.value) { }
                return result;
            },

            modInverse: function(value, mod) {
                const val = wrap(value);
                const m = wrap(mod);

                if(val < 1n) {
                    throw new Error("Value must be positive: " + val);
                } else if(me.gcd(val, m) !== 1n) {
                    throw new Error("Cannot invert value");
                }

                const ks = [...gcdstep(val, m)].slice(0, -1);
                let x = 0n, y = 1n, u = 1n, v = -ks[ks.length - 1];
                for(let i = ks.length - 2; i >= 0; i--) {
                    const x2 = x * 0n + y * 1n;
                    const y2 = x * 1n - y * ks[i];
                    const u2 = u * 0n + v * 1n;
                    const v2 = u * 1n - v * ks[i];
                    [x, y, u, v] = [x2, y2, u2, v2];
                    log("passed");
                }
                const solution = val > m ? x : y;
                return solution < 0n ? solution + m : solution;
            },

            modPow: function(value, exp, modulo) {
                if(exp < 0n) {
                    return me.modPow(me.modInverse(value, modulo), -exp, modulo);
                } else {
                    return modPowBase(value, exp, modulo, (b, m) => b);
                }
            },

            isProbablePrime: function(value, certainty) {
                return primeByMillerRabinTest(value, certainty);
            },

            sqrt: function(value) {
                const v = wrap(value);

                if(v < 0n) {
                    throw new Error("Value must be positive: " + val);
                }
                return sqrt(v);
            }
        };
        return me;
    }

    const B = BigIntLib();

    function Rational(axiom) {
        function defaultConvert(num) {
            if(typeof num === "bigint") {
                return num;
            } else if(typeof num === "number" && Number.isSafeInteger(num)) {
                return BigInt(num);
            } else if(typeof num === "string") {
                return BigInt(num);
            } else {
                throw new Error("Invalid type: " + num);
            }
        }

        function defaultIsRational(r) {
            return r.tag === "rational";
        }

        function defaultNumer(r) {
            if(isRational(r)) {
                return convert(r.numer);
            } else {
                return convert(r);
            }
        }

        function defaultDenom(r) {
            if(isRational(r)) {
                return convert(r.denom);
            } else {
                return 1n;
            }
        }

        function defaultMakeRational(n, d) {
            const cn = convert(n), cd = convert(d);

            if(cd === 0n) {
                throw new Error("denominator is zero");
            } else if(cn === 0n) {
                return {
                    tag: "rational",
                    numer: 0n,
                    denom: 1n
                };
            }

            const signum = cn < 0n && cd < 0n || cn > 0n && cd > 0n ? 1n : -1n;
            const g = convert(B.gcd(B.abs(cn), B.abs(cd)));

            return {
                tag: "rational",
                numer: toString(signum * B.abs(n / g)),
                denom: toString(B.abs(d / g))
            };
        }

        function defaultIsZero(x) {
            return numer(x) === 0n;
        }

        function defaultNegateInteger(x) {
            return -x;
        }

        function defaultAddInteger(x, y) {
            return x + y;
        }

        function defaultMultiplyInteger(x, y) {
            return x * y;
        }

        function defaultSignum(x) {
            return numer(x) < 0n ? -1 : numer(x) === 0n ? 0 : 1;
        }

        function defaultToString(num) {
            return num.toString();
        }

        const convert = axiom && axiom.convert ? axiom.convert : defaultConvert;
        const isRational = axiom && axiom.isRational ? axiom.isRational : defaultIsRational;
        const numer = axiom && axiom.numer ? axiom.numer : defaultNumer;
        const denom = axiom && axiom.denom ? axiom.denom : defaultDenom;
        const makeRational = axiom && axiom.makeRational ? axiom.makeRational : defaultMakeRational;
        const isZero = axiom && axiom.isZero ? axiom.isZero : defaultIsZero;
        const zero = axiom && axiom.zero ? axiom.zero : defaultMakeRational(0n, 1n);
        const isUnitInteger = axiom && axiom.isUnitInteger ? axiom.isUnitInteger : x => x === 1n;
        const negateInteger = axiom && axiom.negateInteger ? axiom.negateInteger : defaultNegateInteger;
        const addInteger = axiom && axiom.addInteger ? axiom.addInteger : defaultAddInteger;
        const multiplyInteger = axiom && axiom.multiplyInteger ? axiom.multiplyInteger : defaultMultiplyInteger;
        const signum = axiom && axiom.signum ? axiom.signum : defaultSignum;
        const toString = axiom && axiom.to_string ? axiom.to_string : defaultToString;

        function negate(x) {
            return makeRational(negateInteger(numer(x)), denom(x));
        }

        function invert(x) {
            if(isZero(x)) {
                throw new MyError("divide by zero");
            }
            return makeRational(denom(x), numer(x));
        }

        function add(x, y) {
            return makeRational(
                addInteger(multiplyInteger(numer(x), denom(y)), multiplyInteger(numer(y), denom(x))),
                multiplyInteger(denom(x), denom(y)));
        }

        function subtract(x, y) {
            return makeRational(
                addInteger(multiplyInteger(numer(x), denom(y)), negateInteger(multiplyInteger(numer(y), denom(x)))),
                multiplyInteger(denom(x), denom(y)));
        }

        function multiply(x, y) {
            return isZero(x) || isZero(y)
                   ? zero
                   : makeRational(multiplyInteger(numer(x), numer(y)), multiplyInteger(denom(x), denom(y)));
        }

        function divide(x, y) {
            if(isZero(y)) {
                throw new MyError("divide by zero");
            }
            return isZero(x)
                   ? zero
                   : makeRational(multiplyInteger(numer(x), denom(y)), multiplyInteger(denom(x), numer(y)));
        }

        function isEqual(x, y) {
            return isZero(subtract(x, y));
        }

        function isUnit(r) {
            return isUnitInteger(numer(r)) && isUnitInteger(denom(r));
        }

        function compare(x, y) {
            return signum(subtract(x, y));
        }

        function abs(x) {
            return compare(x, zero) < 0 ? makeRational(negateInteger(numer(x)), denom(x)) : x;
        }

        function toNumber(r) {
            return Number(numer(r)) / Number(denom(r));
        }

        function toStringRational(r) {
            return isUnit(denom(r))
                   ? toString(numer(r))
                   : toString(numer(r)) + "/" + toString(denom(r));
        }

        const me = {
            isRational: isRational,
            numer: numer,
            denom: denom,
            makeRational: makeRational,
            isZero: isZero,
            zero: zero,
            signum: signum,
            negate: negate,
            invert: invert,
            add: add,
            subtract: subtract,
            multiply: multiply,
            divide: divide,
            isEqual: isEqual,
            isUnit: isUnit,
            compare: compare,
            abs: abs,
            toNumber: toNumber,
            toString: toStringRational
        };
        return me;
    }

    const rat = Rational();

    function APEG(option) {
        const optIgnore = option ? wrap(option.ignore) : null;
        const optKeys = option ? option.keys : null;
        const concatNotSkip = concat0((match, index) => index);
        const patternFloat = /[\+\-]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?:[eE][\+\-]?[0-9]+)?/;

        function wrap(anObject) {
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
                const reSource = anObject.source;
                const reFlags = "g" + (anObject.ignoreCase ? "i" : "") + (anObject.multiline ? "m" : "");
                const regex = new RegExp(reSource, reFlags);

                return function(match0, lastindex, attr) {
                    regex.lastIndex = 0;
                    const match = regex.exec(match0.substring(lastindex));

                    if(match && match.index === 0) {
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

        function defaultSkipSpace(match, index) {
            if(!optIgnore) {
                return index;
            } else {
                const result = optIgnore(match, index, null);

                return result ? result.lastIndex : index;
            }
        }

        function concat0(skipSpace, action) {
            return function(...args0) {
                const args = args0.map(x => wrap(x));

                return function(match, index, attr) {
                    let indexNew = index;
                    let attrNew = attr;

                    for(let i = 0; i < args.length; i++) {
                        const result = args[i](match, indexNew, attrNew);

                        if(result) {
                            indexNew = skipSpace(match, result.lastIndex);
                            attrNew = action(result.attr, attrNew);
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

        const me = {
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

            concat: concat0(defaultSkipSpace, (s, i) => s),

            choice: function(...args0) {
                const args = args0.map(x => wrap(x));

                return function(match, index, attr) {
                    for(let i = 0; i < args.length; i++) {
                        const result = args[i](match, index, attr);

                        if(result) {
                            return result;
                        }
                    }
                    return null;
                };
            },

            action: function(exp, action) {
                const wrapped = wrap(exp);

                return function(match, index, attr) {
                    const result = wrapped(match, index, attr);

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
                const wrapped = wrap(exp);

                return function(match, index, attr) {
                    const result = wrapped(match, index, attr);

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

            lookahead: function(exp) {
                const wrapped = wrap(exp);

                return function(match, index, attr) {
                    const result = wrapped(match, index, attr);

                    if(result) {
                        return {
                            match: "",
                            lastIndex: index,
                            attr: result.attr
                        };
                    } else {
                        return null;
                    }
                };
            },

            letrec: function(...l) {
                const delays = [];
                const memo = [];

                for(let i = 0; i < l.length; i++) {
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
                return me.letrec(y => me.choice(me.concat(exp, y), ""));
            },

            oneOrMore: function(exp) {
                return me.concat(exp, me.zeroOrMore(exp));
            },

            opt: function(exp) {
                return me.choice(exp, "");
            },

            attr: function(val) {
                return me.action("", () => val);
            },

            real: function(val) {
                return me.action(patternFloat, match => parseFloat(match));
            },

            key: function(key) {
                if(!optKeys) {
                    throw new Error("keys are not set");
                }
                const skipKeys = optKeys.filter(k => key.length < k.length && key === k.substring(0, key.length));
                return me.concat(me.lookaheadNot(me.choice.apply(null, skipKeys)), key);
            },

            notKey: function() {
                if(!optKeys) {
                    throw new Error("keys are not set");
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

    const P = APEG({ ignore: /[ \t\n]+/ });

    function AxiomS(opt) {
        const undef = void 0;
        const isOptFalsy = !opt ||
            (!opt.pair &&
             !opt.head &&
             !opt.tail &&
             !(opt.isPair || opt.isAtom) &&
             !opt.nil);

        if(!(isOptFalsy ||
                (opt.pair &&
                 opt.head &&
                 opt.tail &&
                 (opt.isPair || opt.isAtom) &&
                 opt.nil))) {
            throw new Error("Invalid pair function");
        }

        function error(object, message) {
            throw new Error(message + ": " + object);
        }

        const pair = !isOptFalsy ? opt.pair : (h, t) => [h, t];
        const head = !isOptFalsy ? opt.head : p => isPair(p) ? p[0] : error(p, "Pair required");
        const tail = !isOptFalsy ? opt.tail : p => isPair(p) ? p[1] : error(p, "Pair required");
        const isPair = !isOptFalsy && opt.isPair
                       ? opt.isPair
                       : !isOptFalsy && opt.isAtom
                       ? p => !isAtom(p)
                       : p => Array.isArray(p) && p[0] !== undef && p[1] !== undef && p.length === 2;
        const nil = !isOptFalsy ? opt.nil : null;

        const isNull = opt && opt.isNull ? opt.isNull : p => p === nil;
        const atomToString = opt && opt.atomToString ? opt.atomToString : a => a === nil ? "null" : a.toString();
        const parseAtom = opt && opt.parseAtom  ? opt.parseAtom : x => x;

        function toS(array) {
            function loop(i) {
                return i === array.length
                       ? nil
                       : pair(array[i], loop(i + 1));
            }
            return loop(0);
        }

        function toArray(s) {
            return isNull(s)
                   ? []
                   : !isPair(s)
                   ? error(s, "Proper list required")
                   : [head(s)].concat(toArray(tail(s)));
        }

        function toSDeep(array) {
            function loop(i) {
                return i === array.length
                       ? nil
                       : Array.isArray(array[i])
                       ? pair(toSDeep(array[i]), loop(i + 1))
                       : pair(array[i], loop(i + 1));
            }
            return loop(0);
        }

        function toArrayDeep(s) {
            return isNull(s)
                   ? []
                   : !isPair(s)
                   ? error(s, "Proper list required")
                   : isPair(head(s))
                   ? [toArrayDeep(head(s))].concat(toArrayDeep(tail(s)))
                   : [head(s)].concat(toArrayDeep(tail(s)));
        }

        function isEqual(list1, list2) {
            if(isNull(list1)) {
                return isNull(list2);
            } else if(!isPair(list1)) {
                return !isNull(list2) && !isPair(list2) && list1 === list2;
            } else {
                return isNull(list2) || !isPair(list2)
                       ? false
                       : isEqual(head(list1), head(list2)) && isEqual(tail(list1), tail(list2));
            }
        }

        function map(f, ...args) {
            const arglist = toS(args);

            function getArgsArray(f, list) {
                if(isNull(list)) {
                    return [];
                } else {
                    const array = getArgsArray(f, tail(list));

                    return isNull(array)
                           ? nil
                           : isNull(head(list))
                           ? nil
                           : !isPair(head(list))
                           ? error(head(list), "Proper list required")
                           : [f(head(list))].concat(array);
                }
            }

            const headsArray = getArgsArray(head, arglist);

            return isNull(arglist)
                   ? nil
                   : isNull(headsArray)
                   ? nil
                   : pair(f.apply(null, headsArray), map.apply(null, [f].concat(getArgsArray(tail, arglist))));
        }

        function filter(pred, list) {
            return isNull(list)
                   ? nil
                   : !isPair(list)
                   ? error(list, "Proper list required")
                   : pred(head(list))
                   ? pair(head(list), filter(pred, tail(list)))
                   : filter(pred, tail(list));
        }

        function fold(f, init, list) {
            return isNull(list)
                   ? init
                   : !isPair(list)
                   ? error(list, "Proper list required")
                   : fold(f, f(init, head(list)), tail(list));
        }

        function append(...args) {
            const arglist = toS(args);

            function appends(now, arglist) {
                return !isNull(now) && !isPair(now)
                       ? error(now, "Proper list required")
                       : !isNull(now)
                       ? pair(head(now), appends(tail(now), arglist))
                       : isNull(arglist)
                       ? nil
                       : appends(head(arglist), tail(arglist));
            }
            return isNull(arglist)
                   ? nil
                   : appends(head(arglist), tail(arglist));
        }

        function isList(list) {
            return isNull(list)
                   ? true
                   : !isPair(list)
                   ? false
                   : isList(tail(list));
        }

        function length(list) {
            return fold((init, now) => init + 1, 0, list);
        }

        function reverse(list) {
            return fold((init, now) => pair(now, init), nil, list);
        }

        function listTail(list, k) {
            return k <= 0
                   ? list
                   : !isPair(list)
                   ? error(list, "Length too short")
                   : listTail(tail(list), k - 1);
        }

        function listRef(list, k) {
            function loop(list1, m) {
                return !isPair(list1)
                       ? error(k, "Length too short")
                       : m === 0
                       ? head(list1)
                       : loop(tail(list1), m - 1);
            }

            return Number.isSafeInteger(k) && k >= 0
                   ? loop(list, k)
                   : error(k, "Non-negative integer required");
        }

        function memassf(f, pickeq, pickresult, obj, list) {
            function loop(list1) {
                return isNull(list1)
                       ? nil
                       : !isPair(list1)
                       ? error(list, "Proper list requried")
                       : f(pickeq(list1), obj)
                       ? pickresult(list1)
                       : loop(tail(list1));
            }
            return loop(list);
        }

        function flatmap(f, ...args) {
            return fold(append, nil, map.apply(null, [f].concat(args)));
        }

        function iota(n, m, step) {
            const st = step ? step : 1;

            return n > m ? nil : pair(n, iota(n + st, m, st));
        }

        function toString(list) {
            function loop(list, delim) {
                return isNull(list)
                       ? ")"
                       : !isPair(list)
                       ? " . " + atomToString(list) + ")"
                       : !isPair(head(list))
                       ? delim + atomToString(head(list)) + loop(tail(list), " ")
                       : delim + toString(head(list)) + loop(tail(list), " ");
            }
            return !isPair(list)
                   ? atomToString(list)
                   : "(" + loop(list, "");
        }

        function parse(aString) {
            const atom = /"[^\n"]*"|'[^\n']*'|[^\(\)"' \t\n]+/y;
            const space = /[ \t\n]*/y;

            function test(regex, position) {
                regex.lastIndex = position;
                return regex.test(aString);
            }

            function match(regex, position, f) {
                regex.lastIndex = position;
                const result = regex.exec(aString)[0];

                return pair(position + result.length, f(result));
            }

            function spaceLength(position) {
                return position >= aString.length
                       ? position
                       : head(match(space, position, x => x));
            }

            function isFollow(position) {
                const spaceResult = spaceLength(position);

                return aString.charAt(spaceResult) === ")";
            }

            function parseList(position, init) {
                const startSpace = spaceLength(position);

                if(startSpace >= aString.length) {
                    error(startSpace, "S-Expression syntax error");
                } else if(isFollow(startSpace)) {
                    return pair(startSpace + 1, nil);
                } else if(aString.startsWith(".", startSpace)) {
                    if(init) {
                        error(startSpace, "S-Expression syntax error");
                    }

                    const spaceResult = spaceLength(startSpace + 1);
                    const headResult = parseAtomInner(spaceResult);

                    return isFollow(head(headResult))
                           ? pair(head(headResult) + 1, tail(headResult))
                           : error(startSpace, "S-Expression syntax error");
                } else {
                    const headResult = parseAtomInner(startSpace);
                    const spaceResult = spaceLength(head(headResult));
                    const tailResult = parseList(spaceResult, false);

                    return pair(head(tailResult), pair(tail(headResult), tail(tailResult)));
                }
            }

            function parseAtomInner(position) {
                return position >= aString.length
                       ? error(position, "S-Experssion syntax error")
                       : test(atom, position)
                       ? match(atom, position, x => parseAtom(x))
                       : aString.startsWith("(", position)
                       ? parseList(position + 1, true)
                       : error(position, "S-Expression syntax error");
            }

            const result = parseAtomInner(spaceLength(0));

            return spaceLength(head(result)) < aString.length
                   ? error(head(result), "S-Expression syntax error")
                   : tail(result);
        }

        const me = {
            error: error,
            pair: pair,
            head: head,
            tail: tail,
            isPair: isPair,
            isNull: isNull,
            getNil: () => nil,
            car: head,
            cdr: tail,
            isEqual: isEqual,
            list: (...args) => toS(args),
            toS: toS,
            toArray: toArray,
            toSDeep: toSDeep,
            toArrayDeep: toArrayDeep,
            caar: x => head(head(x)),
            cadr: x => head(tail(x)),
            cdar: x => tail(head(x)),
            cddr: x => tail(tail(x)),
            caaar: x => head(head(head(x))),
            caadr: x => head(head(tail(x))),
            cadar: x => head(tail(head(x))),
            caddr: x => head(tail(tail(x))),
            cdaar: x => tail(head(head(x))),
            cdadr: x => tail(head(tail(x))),
            cddar: x => tail(tail(head(x))),
            cdddr: x => tail(tail(tail(x))),
            caaaar: x => head(head(head(head(x)))),
            caaadr: x => head(head(head(tail(x)))),
            caadar: x => head(head(tail(head(x)))),
            caaddr: x => head(head(tail(tail(x)))),
            cadaar: x => head(tail(head(head(x)))),
            cadadr: x => head(tail(head(tail(x)))),
            caddar: x => head(tail(tail(head(x)))),
            cadddr: x => head(tail(tail(tail(x)))),
            cdaaar: x => tail(head(head(head(x)))),
            cdaadr: x => tail(head(head(tail(x)))),
            cdadar: x => tail(head(tail(head(x)))),
            cdaddr: x => tail(head(tail(tail(x)))),
            cddaar: x => tail(tail(head(head(x)))),
            cddadr: x => tail(tail(head(tail(x)))),
            cdddar: x => tail(tail(tail(head(x)))),
            cddddr: x => tail(tail(tail(tail(x)))),
            map: map,
            filter: filter,
            fold: fold,
            append: append,
            isList: isList,
            length: length,
            reverse: reverse,
            listTail: listTail,
            listRef: listRef,
            memq: (obj, list) => memassf((x, y) => x === y, head, x => x, obj, list),
            member: (obj, list) => memassf((x, y) => isEqual(x, y), head, x => x, obj, list),
            assq: (obj, list) => memassf((x, y) => x === y, me.caar, head, obj, list),
            assoc: (obj, list) => memassf((x, y) => isEqual(x, y), me.caar, head, obj, list),
            flatmap: flatmap,
            iota: iota,
            toString: toString,
            parse: parse
        }
        return me;
    }

    const L = AxiomS();

    function AxiomObject(axiom) {
        function defaultMake(...args) {
            const result = {};

            for(let i = 0; i < args.length; i += 2) {
                if(!isUndefined(args[i + 1])) {
                    result[args[i]] = args[i + 1];
                }
            }
            return result;
        }

        function defaultMap(f, object) {
            return Object.fromEntries(
                Object.entries(object)
                    .map(x => make("key", x[0], "value", x[1]))
                    .map(x => f(x))
                    .filter(x => !isUndefined(get(x, "value")))
                    .map(x => [get(x, "key"), get(x, "value")]));
        }

        const undef = void 0;
        const make = axiom && axiom.make ? axiom.make : defaultMake;
        const map = axiom && axiom.map ? axiom.map : defaultMap;
        const get = axiom && axiom.get ? axiom.get : (x, key) => x[key];
        const isObject = axiom && axiom.isObject ? axiom.isObject : x => typeof x === "object" && x !== null && !Array.isArray(x);
        const isUndefined = axiom && axiom.isUndefined ? axiom.isUndefined : x => x === undef;

        function replace(x, key, value) {
            return mapKey(x, key, x => value);
        }

        function mapKey(x, key, f) {
            return map(e => make("key", get(e, "key"), "value", get(e, "key") === key ? f(get(e, "value")) : get(e, "value")), x);
        }

        const me = {
            make: make,
            map: map,
            get: get,
            isObject: isObject,
            isUndefined: isUndefined,
            replace: replace,
            mapKey: mapKey
        };
        return me;
    }

    const J = AxiomObject();

    function piParser(outputFunc) {
        function expression(x, op, action) {
            return P.concat(x, P.zeroOrMore(P.action(P.concat(op, x), (m, s, i) => action(m, i, s))));
        }

        function makeRational(numer, denom) {
            return makeSingleFactorTerm(rat.makeRational(numer, denom), 0, 0);
        }

        function makeE() {
            return makeSingleFactorTerm(rat.makeRational(1n, 1n), 0, 1);
        }

        function makePi() {
            return makeSingleFactorTerm(rat.makeRational(1n, 1n), 1, 0);
        }

        function makeRationalCF(terms) {
            let an = 0, bn = terms[0];
            let A1 = 1, B1 = 0, An = bn, Bn = 1;

            for(let i = 1; i < terms.length; i++) {
                const ta = An, tb = Bn;
                an = 1n;
                bn = terms[i];
                An = rat.add(rat.multiply(bn, An), rat.multiply(an, A1));
                Bn = rat.add(rat.multiply(bn, Bn), rat.multiply(an, B1));
                A1 = ta;
                B1 = tb;
            }
            return makeSingleFactorTerm(rat.divide(An, Bn), 0, 0);
        }

        function makeCompare(op, x, y) {
            return {
                tag: op,
                x: x,
                y: y
            };
        }

        function expandAndToString(x, num) {
            if(num <= 0) {
                throw new MyError("expansion count must be positve");
            }

            const result = contfrac(scaleRational(x, num * 5));
            let text = "[";
            let delim = ";";
            let done = false;

            const nxt0 = result.next();
            if(nxt0.done) {
                text = nxt0.value.toString();
            } else {
                text += nxt0.value;
                for(let i = 0; i < num; i++) {
                    text += delim;
                    delim = ",";

                    const nxt = result.next();
                    text += nxt.value;
                    if(!!(done = nxt.done)) {
                        break;
                    }
                }
                text += done ? "]" : ",...]";
            }
            outputFunc(text);
        }

        function scaleAndToString(x, digit) {
            function makeZero(result, length) {
                return length <= 0
                       ? result
                       : makeZero(result + "0", length - 1);
            }

            const result = scale(x, digit);
            const resultWithSign = result.toString();
            const resultSign = resultWithSign.startsWith("-") ? "-" : "";
            const resultString = resultWithSign.startsWith("-") ? resultWithSign.substring(1) : resultWithSign;
            const intLength = resultString.length - digit;
            const integerPart = intLength > 0 ? resultString.substring(0, intLength) : "0";
            const fracPart = makeZero("", -intLength) + resultString.substring(Math.max(0, intLength));

            outputFunc(resultSign + integerPart + "." + fracPart);
        }

        function exprToString(x) {
            return rat.isRational(x)
                   ? rat.toString(x)
                   : ratT.isRational(x)
                   ? (isUnitTerm(ratT.denom(x)) ? termToString(ratT.numer(x)) : ratT.toString(x))
                   : termToString(x);
        }

        const parserExpr = P.letrec(
            function(x, y) {
                const unary = P.choice(P.action(P.concat("-", y), (m, s, i) => negate(s)), y);
                const factor = P.choice(
                    expression(unary, /[\*\/]/, (m, x, y) => m.startsWith("*") ? multiply(x, y) : divide(x, y)),
                    unary);
                const term = P.choice(
                    expression(factor, /[\+\-]/, (m, x, y) => m.startsWith("+") ? add(x, y) : subtract(x, y)),
                    factor);
                const compare = P.choice(
                    P.concat(term, P.action(P.concat("<", term), (m, s, i) => makeCompare("<", i, s))),
                    P.concat(term, P.action(P.concat("<=", term), (m, s, i) => makeCompare("<=", i, s))),
                    P.concat(term, P.action(P.concat(">", term), (m, s, i) => makeCompare(">", i, s))),
                    P.concat(term, P.action(P.concat(">=", term), (m, s, i) => makeCompare(">=", i, s))),
                    P.concat(term, P.action(P.concat("==", term), (m, s, i) => makeCompare("==", i, s))),
                    P.concat(term, P.action(P.concat("!=", term), (m, s, i) => makeCompare("!=", i, s))),
                    term);

                return compare;
            },
            function(x, y) {
                function makeDenom(d) {
                    function iter(result, d) {
                        return d === 0
                               ? result
                               : iter(result + "0", d - 1);
                    }
                    return "1" + iter("", d.length);
                }

                function a(x) {
                    console.log(x);
                    return x;
                }

                const rationalCFTermInt = P.action(/[\+\-]?[0-9]+/, (m, s, i) => BigInt(m));
                const rationalCFTerm = P.action(/[0-9]+/, (m, s, i) => BigInt(m));
                const rationalCF = P.action(P.concat(
                    "[",
                    P.action(rationalCFTermInt, (m, s, i) => [s]),
                    ";",
                    P.action(rationalCFTerm, (m, s, i) => i.concat([s])),
                    P.zeroOrMore(P.action(P.concat(",", rationalCFTerm), (m, s, i) => i.concat([s]))),
                    "]"), (m, s, i) => makeRationalCF(s));
                const element = P.choice(
                    P.concat("(", x, ")"),
                    P.action("pi", (m, s, i) => makePi()),
                    P.action("e", (m, s, i) => makeE()),
                    rationalCF,
                    P.action(/[0-9]+\.[0-9]+/, (m, s, i) => {
                        const splitted = m.split(".");

                        return makeRational(BigInt(splitted[0] + splitted[1]), BigInt(makeDenom(splitted[1])));
                    }),
                    P.action(/[0-9]+/, (m, s, i) => makeRational(BigInt(m), 1n)));

                return element;
            }
        );

        const parserStmt = P.choice(
            P.concat("expand", "(", parserExpr,
                P.action(P.concat(",", P.action(/[0-9]+/, (m, s, i) => parseInt(m)), ")"),
                    (m, s, i) => () => expandAndToString(makeGenerator(i), s))),
            P.concat("scale", "(", parserExpr,
                P.action(P.concat(",", P.action(/[0-9]+/, (m, s, i) => parseInt(m)), ")"),
                    (m, s, i) => () => scaleAndToString(makeGenerator(i), s)))
            //,P.action(parserExpr, (m, s, i) => () => outputFunc(exprToString(divideSameTerm(s))))
        );

        const parser = P.concat(parserStmt, P.isEnd());

        function parse(code) {
            const result = parser(code, 0, null);

            if(result === null) {
                throw new MyError("Syntax error");
            }
            return result.attr();
        }

        return parse;
    }

    function generators() {
        function* value(i, a, b) {
            let an = 0, bn = i;
            let A1 = 1, B1 = 0, An = bn, Bn = 1;

            yield rat.divide(An, Bn);
            for(let i = 1; true; i++) {
                const ta = An, tb = Bn;
                an = a(i);
                bn = b(i);
                An = rat.add(rat.multiply(bn, An), rat.multiply(an, A1));
                Bn = rat.add(rat.multiply(bn, Bn), rat.multiply(an, B1));
                A1 = ta;
                B1 = tb;
                yield rat.divide(An, Bn);
            }
        }

        function* add(x, y) {
            while(true) {
                yield rat.add(x.next().value, y.next().value);
            }
        }

        function* addScalar(s, x) {
            while(true) {
                yield rat.add(s, x.next().value);
            }
        }

        function* negate(x) {
            while(true) {
                const a1 = x.next().value;
                const a2 = x.next().value;
                yield rat.negate(a2);
                yield rat.negate(a1);
            }
        }

        function* subtract(x, y) {
            // ignore first and second values
            x.next().value; x.next().value;
            y.next().value; y.next().value;
            yield* add(x, negate(y));
        }

        function* multiply(x, y) {
            while(true) {
                yield rat.multiply(x.next().value, y.next().value);
            }
        }

        function* multiplyScalar(s, x) {
            const sign = rat.compare(s, rat.zero);

            if(sign > 0) {
                while(true) {
                    yield rat.multiply(s, x.next().value);
                }
            } else if(sign < 0) {
                while(true) {
                    const r1 = rat.multiply(s, x.next().value);
                    const r2 = rat.multiply(s, x.next().value);

                    yield r2;
                    yield r1;
                }
            } else {
                throw new Error("zero multiplied");
            }
        }

        function* invert(x) {
            // ignore first and second values
            x.next().value; x.next().value;

            while(true) {
                const a1 = x.next().value;
                const a2 = x.next().value;
                yield rat.invert(a2);
                yield rat.invert(a1);
            }
        }

        function* divide(x, y) {
            yield* multiply(x, invert(y));
        }

        function* exp(x, y) {
            const ea = i => i === 1 ? 2 * x : x * x;
            const eb = i => i === 1 ? 2 * y - x : ((i - 1) * 4 + 2) * y;
            yield* value(1, ea, eb);
        }

        function* piContinuedFraction() {
            const pia = i => i === 1 ? 4 : (i - 1) * (i - 1);
            const pib = i => (i - 1) * 2 + 1;
            yield* value(0, pia, pib);
        }

        function* atan(x, y) {
            const pia = i => i === 1 ? x : (i - 1) * (i - 1) * x * x;
            const pib = i => ((i - 1) * 2 + 1) * y;
            yield* value(0, pia, pib);
        }

        function* log1(x, y) {
            const la = i => i === 1 ? x : Math.ceil((i - 1) / 2) * x;
            const lb = i => i % 2 === 0 ? 2 : i * y;
            yield* value(0, la, lb);
        }

        function* sqrt(x, y) {
            yield* value(x, i => y, i => 2 * x);
        }

        function compare(dest) {
            while(true) {
                const d1 = dest.next().value;
                const d2 = dest.next().value;

                if(rat.signum(d1) > 0 && rat.signum(d2) > 0) {
                    return 1;
                } else if(rat.signum(d1) < 0 && rat.signum(d2) < 0) {
                    return -1;
                }
            }
        }

        const me = {
            add: add,
            addScalar: addScalar,
            negate: negate,
            subtract: subtract,
            multiply: multiply,
            multiplyScalar: multiplyScalar,
            invert: invert,
            divide: divide,
            exp: exp,
            pi: piContinuedFraction,
            atan: atan,
            log1: log1,
            sqrt: sqrt,
            compare: compare
        };
        return me;
    }

    const gene = generators();

    function getCoeff(f) {
        return J.get(f, "coeff");
    }

    function makeFactor(coeff, powPi, powE) {
        return J.make("coeff", coeff, "pi", powPi, "e", powE);
    }

    function compareOrder(f1, f2) {
        if(J.get(f1, "pi") !== J.get(f2, "pi")) {
            return J.get(f1, "pi") < J.get(f2, "pi") ? -1 : 1;
        } else if(J.get(f1, "e") !== J.get(f2, "e")) {
            return J.get(f1, "e") < J.get(f2, "e") ? -1 : 1;
        } else {
            return 0;
        }
    }

    function makeFromSingleFactor(f) {
        return L.list(f);
    }

    function makeSingleFactorTerm(coeff, powPi, powE) {
        return L.list(makeFactor(coeff, powPi, powE));
    }

    function negateFactor(f) {
        return J.mapKey(f, "coeff", x => rat.negate(x));
    }

    function multiplyFactor(f, g) {
        return J.make(
            "coeff",
            rat.multiply(J.get(f, "coeff"), J.get(g, "coeff")),
            "pi",
            J.get(f, "pi") + J.get(g, "pi"),
            "e",
            J.get(f, "e") + J.get(g, "e"));
    }

    function divideFactor(f, g) {
        return J.make(
            "coeff",
            rat.divide(J.get(f, "coeff"), J.get(g, "coeff")),
            "pi",
            J.get(f, "pi") - J.get(g, "pi"),
            "e",
            J.get(f, "e") - J.get(g, "e"));
    }

    function isRational(f) {
        return J.get(f, "pi") === 0 && J.get(f, "e") === 0;
    }

    function gcdRational(a, b) {
        const aSignum = rat.numer(a) < 0n ? -1n : rat.numer(a) === 0n ? 0n : 1n;
        const bSignum = rat.numer(b) < 0n ? -1n : rat.numer(b) === 0n ? 0n : 1n;
        const signum = aSignum * bSignum;

        return rat.makeRational(signum * B.gcd(B.abs(rat.numer(a)), B.abs(rat.numer(b))), B.gcd(rat.denom(a), rat.denom(b)));
    }

    function gcdFactor(f, g) {
        return J.make(
            "coeff",
            rat.abs(gcdRational(J.get(f, "coeff"), J.get(g, "coeff"))),
            "pi",
            Math.min(J.get(f, "pi"), J.get(g, "pi")),
            "e",
            Math.min(J.get(f, "e"), J.get(g, "e")));
    }

    function isEqualFactor(f, g) {
        return rat.isEqual(J.get(f, "coeff"), J.get(g, "coeff")) &&
            J.get(f, "pi") === J.get(g, "pi") &&
            J.get(f, "e") === J.get(g, "e");
    }

    function absFactor(f) {
        return J.make("coeff", rat.abs(J.get(f, "coeff")), "pi", J.get(f, "pi"), "e", J.get(f, "e"));
    }

    function isUnitFactor(f) {
        return rat.isUnit(J.get(f, "coeff")) && J.get(f, "pi") === 0 && J.get(f, "e") === 0;
    }

    function factorToString(f) {
        const coeffStr = !J.get(f, "coeff")
            ? ""
            : rat.isUnit(J.get(f, "coeff"))
            ? ""
            : rat.toString(J.get(f, "coeff"));
        const piStr = J.get(f, "pi") === 0
              ? ""
              : J.get(f, "pi") === 1
              ? "pi"
              : "pi^" + J.get(f, "pi");
        const eStr = J.get(f, "e") === 0
              ? ""
              : J.get(f, "e") === 1
              ? "e"
              : "e^" + J.get(f, "e");

        return piStr === "" && eStr === "" & coeffStr === "" ? "1" : coeffStr + piStr + eStr;
    }

    function isEmptyTerm(x) {
        return L.isNull(x);
    }

    function firstFactor(x) {
        return L.head(x);
    }

    function restTerm(x) {
        return L.tail(x);
    }

    function addTerm(x, y) {
        return isEmptyTerm(x)
               ? y
               : addTerm(restTerm(x), adjoinTerm(firstFactor(x), y));
    }

    function adjoinTerm(f, x) {
        if(isEmptyTerm(x)) {
            return L.pair(f, x);
        } else {
            const first = firstFactor(x);
            const order = compareOrder(f, first);

            if(order === 0) {
                const added = J.replace(f, "coeff", rat.add(J.get(f, "coeff"), J.get(first, "coeff")));

                return rat.isZero(J.get(added, "coeff"))
                       ? restTerm(x)
                       : L.pair(added, restTerm(x));
            } else {
                return order < 0
                       ? L.pair(f, x)
                       : L.pair(first, adjoinTerm(f, restTerm(x)))
            }
        }
    }

    function negateTerm(x) {
        return isEmptyTerm(x)
               ? x
               : L.pair(negateFactor(firstFactor(x)), negateTerm(restTerm(x)));
    }

    function multiplyTerm(x, y) {
        return isEmptyTerm(x)
               ? x
               : addTerm(
                   multiplyFactorToTerm(firstFactor(x), y),
                   multiplyTerm(restTerm(x), y));
    }

    function multiplyFactorToTerm(f, x) {
        return isEmptyTerm(x)
               ? x
               : L.pair(multiplyFactor(f, firstFactor(x)), multiplyFactorToTerm(f, restTerm(x)));
    }

    function divideFactorToTerm(f, x) {
        return isEmptyTerm(x)
               ? x
               : L.pair(divideFactor(f, firstFactor(x)), divideFactorToTerm(f, restTerm(x)));
    }

    function divideFactorToTermRight(x, f) {
        return isEmptyTerm(x)
               ? x
               : L.pair(divideFactor(firstFactor(x), f), divideFactorToTermRight(restTerm(x), f));
    }

    function isConstantTerm(x) {
        return !isEmptyTerm(x) && isEmptyTerm(restTerm(x)) && isRational(firstFactor(x));
    }

    function getConstant(x) {
        if(!isConstantTerm(x)) {
            throw new Error("not constant term :" + x);
        }
        return isEmptyTerm(x) ? rat.makeRational(0n, 1n) : J.get(firstFactor(x), "coeff");
    }

    function commonFactorOfTerm(x) {
        function iter(factor, x) {
            return isEmptyTerm(x)
                   ? factor
                   : iter(gcdFactor(factor, firstFactor(x)), restTerm(x));
        }

        if(isEmptyTerm(x)) {
            return makeFactor(rat.makeRational(1n, 1n), 0, 0);
        } else if(isEmptyTerm(restTerm(x))) {
            return firstFactor(x);
        } else {
            return iter(firstFactor(x), restTerm(x));
        }
    }

    function commonFactorAndTerm(x) {
        const commonFactor = commonFactorOfTerm(x);
        const dividedTerm = divideFactorToTerm(commonFactor, x);

        return {
            "commonFactor": commonFactor,
            "dividedTerm": dividedTerm
        };
    }

    function divideSameTerm(x) {
        const xCommonFactor = commonFactorAndTerm(x.numer);
        const yCommonFactor = commonFactorAndTerm(x.denom);
        const gcd = gcdFactor(xCommonFactor.commonFactor, yCommonFactor.commonFactor);

        if(!isEqualTerm(xCommonFactor.dividedTerm, yCommonFactor.dividedTerm)) {
            return ratT.makeRational(
                divideFactorToTermRight(x.numer, gcd),
                divideFactorToTermRight(x.denom, gcd));
        } else {
            return ratT.makeRational(
                makeFromSingleFactor(divideFactor(xCommonFactor.commonFactor, gcd)),
                makeFromSingleFactor(divideFactor(yCommonFactor.commonFactor, gcd)));
        }
    }

    function isEqualTerm(x, y) {
        return isEmptyTerm(x) && isEmptyTerm(y)
               ? true
               : isEmptyTerm(x) || isEmptyTerm(y)
               ? false
               : isEqualFactor(firstFactor(x), firstFactor(y))
               ? isEqualTerm(restTerm(x), restTerm(y))
               : false;
    }

    function isUnitTerm(x) {
        return !isEmptyTerm(x) && isEmptyTerm(restTerm(x)) && isUnitFactor(firstFactor(x));
    }

    function termToString(x) {
        function iter(result, x, delim) {
            if(isEmptyTerm(x)) {
                return result;
            } else {
                const first = firstFactor(x);
                const d = delim === ""
                          ? (rat.compare(J.get(first, "coeff"), rat.zero) < 0 ? "-" : "")
                          : rat.compare(J.get(first, "coeff"), rat.zero) < 0
                          ? " - "
                          : " + ";

                return iter(result + d + factorToString(absFactor(first)), restTerm(x), " + ");
            }
        }
        return isEmptyTerm(x) ? "0" : isEmptyTerm(restTerm(x)) ? factorToString(firstFactor(x)) : iter("", L.reverse(x), "");
    }

    function termToStringRational(x) {
        return isEmptyTerm(x) || isEmptyTerm(restTerm(x)) ? termToString(x) : "(" + termToString(x) + ")";
    }

    function convertRationalFunction(x) {
        if(ratT.isRational(x)) {
            return x;
        } else {
            return ratT.makeRational(x, unitRationalFunction);
        }
    }

    function getLcmDenom(x) {
        function iter(result, x) {
            if(isEmptyTerm(x)) {
                return result;
            } else {
                const firstDenom = rat.denom(getCoeff(firstFactor(x)));

                return iter(result * firstDenom / B.gcd(result, firstDenom), restTerm(x));
            }
        }
        return isEmptyTerm(x) ? 1n : iter(rat.denom(getCoeff(firstFactor(x))), restTerm(x));
    }

    function makeRationalFunction(n, d) {
        const nLcm = getLcmDenom(n);
        const dLcm = getLcmDenom(d);
        const coeffDenom = nLcm * dLcm / B.gcd(nLcm, dLcm);
        const lcmFactor = makeFactor(coeffDenom, 0, 0);

        return {
            tag: "rational-function",
            numer: multiplyFactorToTerm(lcmFactor, n),
            denom: multiplyFactorToTerm(lcmFactor, d)
        };
    }

    const unitRationalFunction = makeSingleFactorTerm(rat.makeRational(1n, 1n), 0, 0);
    const ratT = Rational({
        isRational: x => x.tag === "rational-function",
        convert: convertRationalFunction,
        numer: x => convertRationalFunction(x).numer,
        denom: x => convertRationalFunction(x).denom,
        makeRational: makeRationalFunction,
        isZero: x => isEmptyTerm(ratT.numer(x)),
        zero: makeRationalFunction(null, unitRationalFunction),
        isUnitInteger: isUnitTerm,
        negateInteger: negateTerm,
        addInteger: addTerm,
        multiplyInteger: multiplyTerm,
        to_string: termToStringRational
    });

    function negate(x) {
        return ratT.negate(x);
    }

    function add(x, y) {
        return ratT.add(x, y);
    }

    function subtract(x, y) {
        return ratT.subtract(x, y);
    }

    function multiply(x, y) {
        return ratT.multiply(x, y);
    }

    function divide(x, y) {
        return ratT.divide(x, y);
    }

    function makeGenerator(x) {
        function makeFactorKey(f, key, generatorFunc) {
            function iter(f0, f) {
                return J.get(f, key) === 0
                       ? f0
                       : iter(gene.multiply(generatorFunc(), f0), J.mapKey(f, key, x => x - 1));
            }

            if(J.get(f, key) === 0) {
                return false;
            } else {
                return iter(generatorFunc(), J.mapKey(f, key, x => x - 1));
            }
        }

        function makeFactor(f) {
            const genePi = makeFactorKey(f, "pi", gene.pi);
            const geneE = makeFactorKey(f, "e", () => gene.exp(1, 1));
            const geneCoeff = J.get(f, "coeff");

            if(genePi && geneE) {
                return gene.multiplyScalar(geneCoeff, gene.multiply(genePi, geneE));
            } else if(genePi) {
                return gene.multiplyScalar(geneCoeff, genePi);
            } else if(geneE) {
                return gene.multiplyScalar(geneCoeff, geneE);
            } else {
                throw new Error("constant factor");
            }
        }

        const compareTag = {
            "<": x => x < 0,
            "<=": x => x <= 0,
            ">": x => x > 0,
            ">=": x => x >= 0,
            "==": x => x == 0,
            "!=": x => x != 0
        };

        function compareResult(sign, tag) {
            return compareTag[tag](sign) ? rat.makeRational(1n, 1n) : rat.makeRational(0n, 1n);
        }

        if(isEmptyTerm(x)) {
            return rat.makeRational(0n, 1n);
        } else if(x.tag === "<" || x.tag === "<=" || x.tag === ">" || x.tag === ">=") {
            const xg = makeGenerator(x.x);
            const yg = makeGenerator(x.y);

            if(rat.isRational(xg) && rat.isRational(yg)) {
                return compareResult(rat.compare(xg, yg), x.tag);
            } else if(rat.isRational(xg)) {
                return compareResult(gene.compare(gene.addScalar(xg, gene.negate(yg))), x.tag);
            } else if(rat.isRational(yg)) {
                return compareResult(gene.compare(gene.addScalar(rat.negate(yg), xg)), x.tag);
            } else if(ratT.isEqual(x.x, x.y)) {
                return rat.makeRational(0n, 1n);
            } else {
                return compareResult(gene.compare(gene.subtract(xg, yg)), x.tag);
            }
        } else if(x.tag === "==" || x.tag === "!=") {
            const xg = makeGenerator(x.x);
            const yg = makeGenerator(x.y);

            if(rat.isRational(xg) && rat.isRational(yg)) {
                return compareResult(rat.compare(xg, yg), x.tag);
            } else if(rat.isRational(xg) || rat.isRational(yg)) {
                return rat.makeRational(x.tag === "==" ? 0n : 1n, 1n);
            } else {
                return compareResult(ratT.isEqual(x.x, x.y) ? 0 : 1, x.tag);
            }
        } else if(ratT.isRational(x)) {
            const xNew = divideSameTerm(x);
            const xg = makeGenerator(xNew.numer);
            const yg = makeGenerator(xNew.denom);

            if(rat.isRational(xg) && rat.isRational(yg)) {
                return rat.divide(xg, yg);
            } else if(rat.isRational(xg)) {
                return gene.multiplyScalar(xg, gene.invert(yg));
            } else if(rat.isRational(yg)) {
                return gene.multiplyScalar(rat.invert(yg), xg);
            } else {
                return gene.divide(xg, yg);
            }
        } else if(isRational(firstFactor(x))) {
            if(isEmptyTerm(restTerm(x))) {
                return J.get(firstFactor(x), "coeff");
            } else {
                return gene.addScalar(J.get(firstFactor(x), "coeff"), makeGenerator(restTerm(x)));
            }
        } else {
            if(isEmptyTerm(restTerm(x))) {
                return makeFactor(firstFactor(x));
            } else {
                return gene.add(makeFactor(firstFactor(x)), makeGenerator(restTerm(x)));
            }
        }
    }

    function scale(x, digits) {
        function order(r, d) {
            return rat.numer(r) * d / rat.denom(r);
        }

        function scaleRat(x) {
            function iter(result, x, d) {
                if(d === 0) {
                    return result;
                } else {
                    const xIntPart = rat.numer(x) / rat.denom(x);
                    const xNext = rat.subtract(x, rat.makeRational(xIntPart, 1n));

                    return iter(result * 10n + xIntPart, rat.multiply(xNext, 10), d - 1);
                }
            }
            return iter(0n, x, digits + 1);
        }

        if(rat.isRational(x)) {
            return scaleRat(x);
        } else {
            const d = 10n ** (BigInt(digits) + 5n);
            let lastValue = null;

            while(true) {
                const g1 = x.next();

                if(g1.done) {
                    return lastValue;
                }

                const g2 = x.next();

                if(g2.done) {
                    return g1.value;
                }

                const on = order(g1.value, d);
                const on1 = order(g2.value, d);

                if(on / 100000n === on1 / 100000n) {
                    return on / 100000n;
                } else {
                    lastValue = g2.value;
                }
            }
        }
    }

    function scaleRational(x, digits) {
        const d = 10n ** (BigInt(digits));

        return rat.isRational(x)
               ? x
               : rat.makeRational(scale(x, digits), d);
    }

    function* contfrac(init) {
        let remainder = init;

        while(true) {
            const result0 = rat.numer(remainder) / rat.denom(remainder);
            const result = rat.numer(remainder) < 0n ? result0 - 1n : result0;

            if(rat.numer(rat.subtract(remainder, result)) === 0n) {
                return result;
            } else {
                remainder = rat.invert(rat.subtract(remainder, result));
                yield result;
            }
        }
    }

    const lib = {
        MyError: MyError,
        B: B,
        rat: rat,
        ratT: ratT,
        piParser: piParser
    };

    if(typeof module !== "undefined" && module.exports) {
        module.exports = lib;
    } else {
        root["epee"] = lib;
    }
})(this);

