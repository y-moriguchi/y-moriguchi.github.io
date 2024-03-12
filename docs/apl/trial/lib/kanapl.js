/*
 * Morilib APL
 *
 * Copyright (c) 2019 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
(function(root) {
    var undef = void 0;

    /*
     * Reference:
     * http://my.fit.edu/~gabdo/gamma.txt
     */
    var GAMMA_COEFFS = [
        0.99999999999999709182,
        57.156235665862923517,
        -59.597960355475491248,
        14.136097974741747174,
        -0.49191381609762019978,
        .33994649984811888699e-4,
        .46523628927048575665e-4,
        -.98374475304879564677e-4,
        .15808870322491248884e-3,
        -.21026444172410488319e-3,
        .21743961811521264320e-3,
        -.16431810653676389022e-3,
        .84418223983852743293e-4,
        -.26190838401581408670e-4,
        .36899182659531622704e-5
    ];
    var LOG_SQRT_2PI = Math.log(2 * Math.PI) / 2;

    var monadic = {
        "-": function(array) {
            return map(array, function(x) { return -x; }, isNumber);
        },

        "×": function(array) {
            return map(array, function(x) {
                return x > 0 ? 1 : x < 0 ? -1 : 0;
            }, isNumber);
        },

        "÷": function(array) {
            return map(array, function(x) { return 1 / x; }, isNumber);
        },

        "ι": function(object1) {
            if(isNumber(object1)) {
                return iota(object1, 1, 1);
            } else if(isString(object1)) {
                throw new Error("DOMAIN ERROR");
            } else {
                throw new Error("NOT SUPPORTED");
            }
        },

        "ρ": function(object1) {
            return scalarize(rho(object1));
        },

        "〆": function(object1) {
            return transpose(object1);
        },

        "*": function(array) {
            return map(array, function(x) { return Math.exp(x); }, isNumber);
        },

        "★": function(array) {
            return monadic["*"](array);
        },

        "☆": function(array) {
            return map(array, function(x) {
                if(x <= 0) {
                    throw new Error("DOMAIN ERROR");
                }
                return Math.log(x);
            }, isNumber);
        },

        "|": function(array) {
            return map(array, function(x) { return Math.abs(x); }, isNumber);
        },

        "「": function(array) {
            return map(array, function(x) { return Math.ceil(x); }, isNumber);
        },

        "」": function(array) {
            return map(array, function(x) { return Math.floor(x); }, isNumber);
        },

        "〇": function(array) {
            return map(array, function(x) { return Math.PI * x; }, isNumber);
        },

        "~": function(array) {
            return map(array, function(x) { return x === 0 ? 1 : 0; });
        },

        "～": function(array) {
            return monadic["~"](array);
        },

        ",": function(array) {
            return toVector(array);
        },

        "?": function(array) {
            return map(array, function(x) {
                if(!(isInteger(x) && x >= 1)) {
                    throw new Error("DOMAIN ERROR");
                }
                return Math.floor(Math.random() * x + 1);
            });
        },

        "!": function(array) {
            return map(array, function(x) { return gamma(x + 1); }, isNumber);
        },

        "♯": function(vector) {
            return sortVector(vector, false);
        },

        "♭": function(vector) {
            return sortVector(vector, true);
        },

        "※": function(matrix) {
            matrixLib.checkDiag(matrix);
            return matrixLib.solveGaussJordan(matrix, matrixLib.makeUnit(matrix.length, matrix.length));
        },

        "◆": function(array) {
            return toStringArray(array, null);
        }
    };

    var dyadic = {
        "+": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) { return x + y; }, isNumber);
        },

        "-": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) { return x - y; }, isNumber);
        },

        "×": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) { return x * y; }, isNumber);
        },

        "÷": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) { return x / y; }, isNumber);
        },

        "ι": function(vector1, object2) {
            checkVectorByFunction(vector1, function(x) { return true; });
            return map(object2, function(x) {
                var result = vector1.indexOf(x);

                return result < 0 ? vector1.length + 1 : result + 1;
            });
        },

        "ρ": function(vector1, vector2) {
            var vec1 = isArray(vector1) ? vector1 : [vector1],
                vec2 = isArray(vector2) ? toVector(vector2) : [vector2];

            function gendim(index, dim) {
                var result = [],
                    resultValue,
                    i,
                    nowIndex = index;

                if(dim >= vec1.length) {
                    return {
                        value: isArray(vec2) ? vec2[index] : vec2,
                        index: index + 1
                    };
                } else {
                    for(i = 0; i < vec1[dim]; i++) {
                        resultValue = gendim(index, dim + 1);
                        index = resultValue.index % vec2.length;
                        result[i] = resultValue.value;
                    }
                    return {
                        value: result,
                        index: index
                    };
                }
            }

            checkVectorByFunction(vec1, function(x) {
                return isInteger(x) && x >= 0;
            });
            if(vec2.length === 0) {
                return 0;
            } else if(vec1.length === 0) {
                return vec2[0];
            } else {
                return gendim(0, 0).value;
            }
        },

        "*": function(object1, object2) {
            function pow(x, y) {
                var res,
                    i;

                if(isInteger(y)) {
                    if(y > 0) {
                        res = x;
                        for(i = 1; i < y; i++) {
                            res *= x;
                        }
                        return res;
                    } else if(y === 0) {
                        return 1;
                    } else if(y < 0) {
                        res = 1 / x;
                        for(i = 1; i < -y; i++) {
                            res /= x;
                        }
                        return res;
                    }
                } else if(y > 0) {
                    return Math.pow(x, y);
                } else {
                    throw new Error("DOMAIN ERROR");
                }
            }
            return map2Scalar(object1, object2, function(x, y) { return pow(x, y); }, isNumber);
        },

        "★": function(object1, object2) {
            return dyadic["*"](object1, object2);
        },

        "☆": function(object1, object2) {
            function log(x, y) {
                if(x <= 0 || y <= 0) {
                    throw new Error("DOMAIN ERROR");
                }
                return Math.log(y) / Math.log(x);
            }
            return map2Scalar(object1, object2, function(x, y) { return log(x, y); }, isNumber);
        },

        "|": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) {
                if(x === 0) {
                    return y;
                } else if(x > 0 && y >= 0) {
                    return y % x;
                } else if(x > 0 && y <= 0) {
                    return y % x + x;
                } else if(x < 0 && y > 0) {
                    return y % x + x;
                } else {
                    return y % x;
                }
            }, isNumber);
        },

        "「": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) {
                return x > y ? x : y;
            }, isNumber);
        },

        "」": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) {
                return x < y ? x : y;
            }, isNumber);
        },

        "〇": function(object1, object2) {
            var fn;

            function fn0(x) {
                if(x > 1) {
                    throw new Error("DOMAIN ERROR");
                }
                return Math.sqrt(1 - x * x);
            }

            function fnM1(x) {
                if(x < -1 || x > 1) {
                    throw new Error("DOMAIN ERROR");
                }
                return Math.asin(x);
            }

            function fnM2(x) {
                if(x < -1 || x > 1) {
                    throw new Error("DOMAIN ERROR");
                }
                return Math.acos(x);
            }

            function fnM4(x) {
                if(x < 1) {
                    throw new Error("DOMAIN ERROR");
                }
                return Math.sqrt(-1 + x * x);
            }

            function fnM6(x) {
                if(x < 1) {
                    throw new Error("DOMAIN ERROR");
                }
                return Math.acosh(x);
            }

            return map2Scalar(object1, object2, function(x, y) {
                function getFn(anInt) {
                    if(!isInteger(anInt)) {
                        throw new Error("DOMAIN ERROR");
                    }
                    switch(anInt) {
                        case 0:   return fn0;
                        case 1:   return Math.sin;
                        case 2:   return Math.cos;
                        case 3:   return Math.tan;
                        case 4:   return function(x) { return Math.sqrt(1 + x * x); };
                        case 5:   return sinh;
                        case 6:   return cosh;
                        case 7:   return tanh;
                        case -1:  return fnM1;
                        case -2:  return fnM2;
                        case -3:  return Math.atan;
                        case -4:  return fnM4;
                        case -5:  return Math.asinh ? Math.asinh : K;
                        case -6:  return Math.acosh ? fnM6 : K;
                        case -7:  return Math.atanh ? Math.atanh : K;
                        default:  return K;
                    }
                }
                fn = getFn(x);
                return fn(y);
            }, isNumber);
        },

        "=": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) { return x === y ? 1 : 0 });
        },

        "≠": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) { return x !== y ? 1 : 0 });
        },

        "<": function(object1, object2) {
            return map2Scalar(object1, object2, relCheck(function(x, y) { return x < y }), isNumber);
        },

        "≦": function(object1, object2) {
            return map2Scalar(object1, object2, relCheck(function(x, y) { return x <= y }), isNumber);
        },

        ">": function(object1, object2) {
            return map2Scalar(object1, object2, relCheck(function(x, y) { return x > y }), isNumber);
        },

        "≧": function(object1, object2) {
            return map2Scalar(object1, object2, relCheck(function(x, y) { return x >= y }), isNumber);
        },

        "^": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) { return x && y ? 1 : 0 });
        },

        "∧": function(object1, object2) {
            return dyadic["^"](object1, object2);
        },

        "v": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) { return x || y ? 1 : 0 });
        },

        "∨": function(object1, object2) {
            return dyadic["v"](object1, object2);
        },

        "†": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) { return !(x && y) ? 1 : 0 });
        },

        "‡": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) { return !(x || y) ? 1 : 0 });
        },

        "〆": function(vector1, array1) {
            return substituteArray(vector1, array1);
        },

        "?": function(number1, number2) {
            var extracted = [],
                i,
                value;

            if(!isInteger(number1) || !isInteger(number2)) {
                throw new Error("DOMAIN ERROR");
            } else if(number1 < 0 || number2 < 0 || number1 > number2) {
                throw new Error("DOMAIN ERROR");
            }
            for(i = 0; i < number1; i++) {
                value = Math.floor(Math.random() * number2 + 1);
                while(extracted.indexOf(value) >= 0) {
                    value = Math.floor(Math.random() * number2 + 1);
                }
                extracted.push(value);
            }
            return extracted;
        },

        "!": function(object1, object2) {
            return map2Scalar(object1, object2, function(x, y) {
                return gamma(y + 1) / gamma(x + 1) / gamma(y - x + 1);
            }, isNumber);
        },

        "↑": function(object1, object2) {
            return takeArray(object1, object2);
        },

        "↓": function(object1, object2) {
            return dropArray(object1, object2);
        },

        "ε": function(object1, object2) {
            return belongToArray(object1, object2);
        },

        "∈": function(object1, object2) {
            return dyadic["ε"](object1, object2);
        },

        "⊥": function(object1, object2) {
            return decodeArray(object1, object2);
        },

        "┴": function(object1, object2) {
            return dyadic["⊥"](object1, object2);
        },

        "┬": function(object1, object2) {
            return encodeArray(object1, object2);
        },

        "※": function(vector1, matrix2) {
            var rho1 = rho(vector1),
                rho2 = rho(matrix2);

            matrixLib.checkMatrix(matrix2);
            if(rho1.length !== 1) {
                throw new Error("RANK ERROR");
            } else if(rho2.length !== 2) {
                throw new Error("RANK ERROR");
            } else if(vector1.length !== matrix2.length) {
                throw new Error("LENGTH ERROR");
            }

            if(matrixLib.isDiag(matrix2)) {
                return matrixLib.solve(matrix2, vector1);
            } else {
                return leastSquare(matrix2, vector1);
            }
        },

        "◆": function(vector1, object2) {
            var vec;

            if(isArray(vector1) && vector1.length > 2) {
                throw new Error("LENGTH ERROR");
            }
            return toStringArray(object2, vector1);
        }
    };

    var operator = {
        ".": function(fn1, fn2) {
            return function(array1, array2) {
                var result = [],
                    rhoArray1,
                    rhoArray2,
                    rhoArray2a;

                function generate1(indicesArray1, rhoArray1, indicesArray2, rhoArray2) {
                    var fold1,
                        i;

                    if(rhoArray1.length > 1) {
                        for(i = 0; i < rhoArray1[0]; i++) {
                            generate1(indicesArray1.concat([i]), rhoArray1.slice(1), indicesArray2, rhoArray2);
                        }
                    } else if(rhoArray2.length > 0) {
                        for(i = 0; i < rhoArray2[0]; i++) {
                            generate1(indicesArray1, rhoArray1, indicesArray2.concat([i]), rhoArray2.slice(1));
                        }
                    } else {
                        fold1 = [];
                        if(rhoArray1[0] !== rhoArray2a) {
                            throw new Error("LENGTH ERROR");
                        }
                        for(i = 0; i < rhoArray2a; i++) {
                            fold1[i] = fn2(getIndex(array1, indicesArray1.concat([i])), getIndex(array2, [i].concat(indicesArray2)));
                        }
                        if(indicesArray1.length + indicesArray2.length > 0) {
                            setIndex(result, indicesArray1.concat(indicesArray2), fold(fold1, fn1));
                        } else {
                            result = fold(fold1, fn1);
                        }
                    }
                }

                function generateLeftScalar(scalar, indicesArray2, rhoArray2) {
                    var fold1,
                        i;

                    if(rhoArray2.length > 0) {
                        for(i = 0; i < rhoArray2[0]; i++) {
                            generateLeftScalar(scalar, indicesArray2.concat([i]), rhoArray2.slice(1));
                        }
                    } else {
                        fold1 = [];
                        for(i = 0; i < rhoArray2a; i++) {
                            fold1[i] = fn2(scalar, getIndex(array2, [i].concat(indicesArray2)));
                        }
                        if(indicesArray2.length > 0) {
                            setIndex(result, indicesArray2, fold(fold1, fn1));
                        } else {
                            result = fold(fold1, fn1);
                        }
                    }
                }

                function generateRightScalar(array1, scalar) {
                    var result = [],
                        fold1,
                        i;

                    if(!isArray(array1[0])) {
                        fold1 = [];
                        for(i = 0; i < array1.length; i++) {
                            fold1[i] = fn2(array1[i], scalar);
                        }
                        return fold(fold1, fn1);
                    } else {
                        for(i = 0; i < array1.length; i++) {
                            result[i] = generateRightScalar(array1[i], scalar);
                        }
                        return result;
                    }
                }

                if(!isArray(array1) && !isArray(array2)) {
                    return fn2(array1, array2);
                } else if(!isArray(array1)) {
                    if(array1.length === 0) {
                        return 0;
                    } else {
                        rhoArray2 = rho(array2);
                        rhoArray2a = rhoArray2[0];
                        generateLeftScalar(array1, [], rhoArray2.slice(1));
                        return result;
                    }
                } else if(!isArray(array2)) {
                    if(array2.length === 0) {
                        return 0;
                    } else {
                        return generateRightScalar(array1, array2);
                    }
                } else if(array1.length === 0 && array2.length === 0) {
                    return 0;
                } else if(array1.length === 0 || array2.length === 0) {
                    throw new Error("LENGTH ERROR");
                } else {
                    rhoArray1 = rho(array1);
                    rhoArray2 = rho(array2);
                    rhoArray2a = rhoArray2[0];
                    generate1([], rhoArray1, [], rhoArray2.slice(1));
                    return result;
                }
            };
        }
    };

    var MAP_APL_CHAR = {
        "\u00af": "￣",
        "\u2206": "△",
        "\u220a": "∈",
        "\u2218": "・",
        "\u2223": "|",
        "\u223c": "～",
        "\u2264": "≦",
        "\u2265": "≧",
        "\u2308": "「",
        "\u230a": "」",
        "\u22a4": "┬",
        "\u22c6": "★",
        "\u2339": "※",
        "\u233d": "φ",
        "\u233f": "/[1]",
        "\u2340": "\\[1]",
        "\u2349": "〆",
        "\u234b": "♯",
        "\u234e": "♪",
        "\u2352": "♭",
        "\u2355": "◆",
        "\u2358": "!",
        "\u235f": "☆",
        "\u2372": "†",
        "\u2371": "‡",
        "\u2373": "ι",
        "\u2374": "ρ"
    };

    var MAP_FULLWIDTH = {
        "１": "1",
        "２": "2",
        "３": "3",
        "４": "4",
        "５": "5",
        "６": "6",
        "７": "7",
        "８": "8",
        "９": "9",
        "０": "0",
        "＋": "+",
        "－": "-"
    };

    var MAP_ASCII_STR = {
        "~": "￣",
        "*": "×",
        "/": "÷",
        "max": "「",
        "min": "」",
        "**": "★",
        "log": "☆",
        "tri": "〇",
        ">=": "≧",
        "<=": "≦",
        "!=": "≠",
        "and": "∧",
        "or": "∨",
        "nand": "†",
        "nor": "‡",
        "outer": "・",
        "rho": "ρ",
        "take": "↑",
        "drop": "↓",
        "/-": "/[1]",
        "\\-": "\\[1]",
        "rotate": "φ",
        "rotate1": "φ[1]",
        "transpose": "〆",
        "iota": "ι",
        "in": "∈",
        "asc": "♯",
        "desc": "♭",
        "domino": "※",
        "encode": "┬",
        "decode": "⊥",
        "eval": "♪",
        "tostring": "◆",
        "<-": "←"
    };

    function K(x) {
        return x;
    }

    function isObject(anObject) {
        return typeof anObject === "object" && anObject !== null;
    }

    function isNumber(anObject) {
        return typeof anObject === "number";
    }

    function isString(anObject) {
        return typeof anObject === "string";
    }

    function isArray(anObject) {
        return Object.prototype.toString.call(anObject) === '[object Array]';
    }

    function isInteger(anObject) {
        return typeof anObject === 'number' && isFinite(anObject) && Math.floor(anObject) === anObject;
    }

    function charArrayToString(anObject) {
        var result = "",
            i;

        if(!isArray(anObject)) {
            throw new Error("DOMAIN ERROR");
        }
        for(i = 0; i < anObject.length; i++) {
            if(isArray(anObject[i])) {
                throw new Error("RANK ERROR");
            } else if(!isString(anObject[i]) || anObject[i].length !== 1) {
                throw new Error("DOMAIN ERROR");
            }
            result += anObject[i];
        }
        return result;
    }

    function stringToCharArray(aString) {
        var result = [],
            i;

        for(i = 0; i < aString.length; i++) {
            result[i] = aString.charAt(i);
        }
        return result;
    }

    function getNumberExponent(aNumber) {
        var matched,
            result;

        if(!(matched = /(-?[0-9]*(?:\.[0-9]+)?)[eE]([\+\-][0-9]+)$/.exec(aNumber.toExponential()))) {
            return NaN;
        }
        result = matched[2].replace(/^\+/, "");
        return [parseFloat(matched[1]), parseInt(result)];
    }

    function sinh(x) {
        var y = Math.exp(x);
        return (y - 1 / y) / 2;
    }

    function cosh(x) {
        var y = Math.exp(x);
        return (y + 1 / y) / 2;
    }

    function tanh(x) {
        var y;
        if(x === Infinity) {
            return 1;
        } else if(x === -Infinity) {
            return -1;
        } else {
            y = Math.exp(2 * x);
            return (y - 1) / (y + 1);
        }
    }

    /*
     * Reference:
     * http://my.fit.edu/~gabdo/gamma.txt
     */
    function lnGamma0(x) {
        var g = 607.0 / 128.0,
            r = 0,
            s = 0,
            t,
            k;

        if(x > 0) {
            for(k = GAMMA_COEFFS.length - 1; k > 0; k--) {
                s += GAMMA_COEFFS[k] / (x + k);
            }
            s += GAMMA_COEFFS[0];
            t  = x + g + 0.5;
            r  = (x + 0.5) * Math.log(t);
            r -= t;
            r += LOG_SQRT_2PI;
            r += Math.log(s / x);
            return r;
        } else {
            return NaN;
        }
    }

    function gamma(x) {
        function frac(n) {
            var i,
                result = 1;

            for(i = 2; i <= n; i++) {
                result *= i;
            }
            return result;
        }

        function sum(n) {
            var i,
                result = 0;

            for(i = 1; i < n; i++) {
                result += i;
            }
            return result;
        }

        if(isInteger(x)) {
            if(x >= 1) {
                return frac(x - 1);
            } else if(x === 0) {
                return 1;
            } else {
                return Infinity;
            }
        } else if(x > 1) {
            return Math.exp(lnGamma0(x));
        } else if(x > 0 && x < 1) {
            return gamma(x + 1) / x;
        } else {
            return -Math.PI / Math.sin(Math.PI * x) / x / gamma(-x);
        }
    }

    var matrixLib = {
        isDiag: function(matrix) {
            if(!isArray(matrix) && matrix.length < 2) {
                throw new Error("RANK ERROR");
            }

            for(i = 0; i < matrix.length; i++) {
                if(matrix[i].length !== matrix.length) {
                    return false;
                }
            }
            return true;
        },

        checkMatrix: function(matrix) {
            var length = -1;

            if(!isArray(matrix) && matrix.length < 2) {
                throw new Error("RANK ERROR");
            }

            for(i = 0; i < matrix.length; i++) {
                checkVectorByFunction(matrix[i], function(x) { return isNumber(x); });
                if(length < 0) {
                    length = matrix[i].length;
                } else if(matrix[i].length !== length) {
                    throw new Error("LENGTH ERROR");
                }
            }
        },

        checkDiag: function(matrix) {
            if(!isArray(matrix) && matrix.length < 2) {
                throw new Error("RANK ERROR");
            }

            for(i = 0; i < matrix.length; i++) {
                checkVectorByFunction(matrix[i], function(x) { return isNumber(x); });
                if(matrix[i].length !== matrix.length) {
                    throw new Error("LENGTH ERROR");
                }
            }
        },

        makeZero: function(sizeI, sizeJ) {
            var i,
                j,
                result = [];

            for(i = 0; i < sizeI; i++) {
                result[i] = [];
                for(j = 0; j < sizeJ; j++) {
                    result[i][j] = 0;
                }
            }
            return result;
        },

        makeUnit: function(sizeI, sizeJ) {
            var i,
                j,
                result = [];

            for(i = 0; i < sizeI; i++) {
                result[i] = [];
                for(j = 0; j < sizeJ; j++) {
                    result[i][j] = i === j ? 1 : 0;
                }
            }
            return result;
        },

        invertPermutation: function(matrix, permutation) {
            var result = [],
                i;

            for(i = 0; i < permutation.length; i++) {
                result[permutation[i]] = matrix[i];
            }
            return result;
        },

        columnPermutation: function(matrix, permutation) {
            var source = deepcopy(matrix),
                result = [],
                i,
                j;

            for(i = 0; i < permutation.length; i++) {
                result[i] = [];
                for(j = 0; j < permutation.length; j++) {
                    result[i][permutation[j]] = source[i][j];
                }
            }
            return result;
        },

        factorizeLU: function(matrix) {
            var i,
                j,
                k,
                m,
                n,
                A,
                L,
                U,
                tA,
                P = iota(matrix.length, 0, 1);

            matrixLib.checkDiag(matrix);
            A = deepcopy(matrix);
            L = matrixLib.makeZero(matrix.length, matrix.length);
            U = matrixLib.makeZero(matrix.length, matrix.length);
            for(k = 0; k < A.length; k++) {
                if(A[k][k] === 0) {
                    for(m = 0; m < A.length; m++) {
                        if(A[k][m] !== 0) {
                            tmp = P[m]; P[m] = P[k]; P[k] = tmp;
                            for(n = 0; n < A.length; n++) {
                                tmp = A[n][m]; A[n][m] = A[n][k]; A[n][k] = tmp;
                            }
                            break;
                        }
                    }
                    if(m >= matrix.length) {
                        throw new Error("DOMAIN ERROR");
                    }
                }

                for(i = 0; i < A[0].length; i++) {
                    if(i < k) {
                        L[i][k] = U[k][i] = 0;
                    } else if(i === k) {
                        L[i][k] = 1;
                        U[k][i] = A[k][k];
                    } else {
                        L[i][k] = A[i][k] / A[k][k];
                        U[k][i] = A[k][i];
                    }
                }

                tA = deepcopy(A);
                for(i = 0; i < A.length; i++) {
                    A[i][k] = A[k][i] = 0;
                }
                for(i = k + 1; i < A.length; i++) {
                    for(j = k + 1; j < A[0].length; j++) {
                        A[i][j] = tA[i][j] - L[i][k] * U[k][j];
                    }
                }
            }

            return {
                P: P,
                L: L,
                U: U
            };
        },

        solve: function(matrix, vector) {
            var i,
                j,
                lu,
                L,
                U,
                y = [],
                V,
                result = [];

            lu = matrixLib.factorizeLU(matrix);
            L = lu.L;
            U = lu.U;
            V = vector.slice();

            for(i = 0; i < matrix.length; i++) {
                y[i] = 0;
                for(j = 0; j < i; j++) {
                    y[i] += L[i][j] * y[j];
                }
                y[i] = (V[i] - y[i]);
            }

            for(i = matrix.length - 1; i >= 0; i--) {
                result[i] = 0;
                for(j = i; j < V.length; j++) {
                    result[i] += U[i][j] * result[j];
                }
                result[i] = (y[i] - result[i]) / U[i][i];
            }
            return matrixLib.invertPermutation(result, lu.P);
        },

        solveGaussJordan: function(matrix, source) {
            var i,
                j,
                k,
                val,
                elm,
                tmp,
                permutation = iota(matrix.length, 0, 1),
                m = deepcopy(matrix),
                v = deepcopy(source);

            matrixLib.checkDiag(matrix);
            for(i = 0; i < m.length; i++) {
                val = m[i][i];
                if(val === 0) {
                    for(j = 0; j < matrix.length; j++) {
                        if(matrix[permutation[j]][i] !== 0) {
                            tmp = permutation[j];
                            permutation[j] = permutation[i];
                            permutation[i] = tmp;
                            tmp = m[j];
                            m[j] = m[i];
                            m[i] = tmp;
                            val = m[i][i];
                            break;
                        }
                    }
                    if(j >= matrix.length) {
                        throw new Error("DOMAIN ERROR");
                    }
                }

                for(j = 0; j < m[i].length; j++) {
                    if(i !== j) {
                        elm = m[j][i] / val;
                        for(k = 0; k < m.length; k++) {
                            m[j][k] = m[j][k] - (m[i][k] * elm);
                        }
                        if(isArray(v[0])) {
                            for(k = 0; k < v.length; k++) {
                                v[j][k] = v[j][k] - (v[i][k] * elm);
                            }
                        } else {
                            v[j] = v[j] - (v[i] * elm);
                        }
                    }
                }

                for(j = 0; j < m[i].length; j++) {
                    if(i === j) {
                        for(k = 0; k < m.length; k++) {
                            if(i === k) {
                                m[j][k] = 1;
                            } else {
                                m[j][k] = m[j][k] / val;
                            }
                        }
                        if(isArray(v[0])) {
                            for(k = 0; k < v.length; k++) {
                                v[j][k] = v[j][k] / val;
                            }
                        } else {
                            v[j] = v[j] / val;
                        }
                    }
                }
            }
            return matrixLib.columnPermutation(v, permutation);
        }
    };

    function leastSquare(matrix, vector) {
        var normalMatrix = [],
            normalVector = [],
            i,
            j,
            k;

        for(i = 0; i < matrix[0].length; i++) {
            normalMatrix[i] = [];
            for(j = 0; j < matrix[0].length; j++) {
                normalMatrix[i][j] = 0;
                for(k = 0; k < matrix.length; k++) {
                    normalMatrix[i][j] += matrix[k][i] * matrix[k][j];
                }
            }
        }

        for(i = 0; i < matrix[0].length; i++) {
            normalVector[i] = 0;
            for(k = 0; k < matrix.length; k++) {
                normalVector[i] += matrix[k][i] * vector[k];
            }
        }

        return matrixLib.solve(normalMatrix, normalVector);
    }

    function deepcopy(anObject) {
        var result;

        function copyAll() {
            var i;

            for(i in anObject) {
                if(anObject.hasOwnProperty(i)) {
                    result[i] = deepcopy(anObject[i]);
                }
            }
        }

        if(isArray(anObject)) {
            result = [];
            copyAll();
            return result;
        } else if(typeof anObject === 'object' && anObject !== null) {
            result = {};
            copyAll();
            return result;
        } else {
            return anObject;
        }
    }

    function relCheck(f) {
        return function(x, y) {
            if(isNumber(x) && isNumber(y)) {
                return f(x, y) ? 1 : 0;
            } else {
                throw new Error("DOMAIN ERROR");
            }
        }
    }

    function mapHomomorphism(mapping, source) {
        var result = "",
            match,
            i;

        for(i = 0; i < source.length; i++) {
            if((match = mapping[source.charAt(i)]) !== undef) {
                result += match;
            } else {
                result += source.charAt(i);
            }
        }
        return result;
    }

    function scalarize(anArray) {
        if(anArray.length === 1 && !isArray(anArray[0])) {
            return anArray[0];
        } else {
            return anArray;
        }
    }

    function getIndex(array1, indexVector) {
        if(isArray(array1)) {
            if(indexVector.length === 0) {
                return array1;
            } else if(!isInteger(indexVector[0])) {
                throw new Error("DOMAIN ERROR");
            } else if(indexVector[0] < 0 || indexVector[0] >= array1.length) {
                throw new Error("INDEX ERROR");
            }
            return getIndex(array1[indexVector[0]], indexVector.slice(1));
        } else {
            return array1;
        }
    }

    function setIndex(array1, indexVector, value) {
        if(array1[indexVector[0]] === undef) {
            array1[indexVector[0]] = [];
        }

        if(!isInteger(indexVector[0])) {
            throw new Error("DOMAIN ERROR");
        } else if(indexVector[0] < 0 || indexVector[0] >= array1.length) {
            throw new Error("INDEX ERROR");
        }

        if(indexVector.length > 1) {
            setIndex(array1[indexVector[0]], indexVector.slice(1), value);
        } else {
            array1[indexVector[0]] = value;
        }
    }

    function checkVectorByFunction(vector0, fn) {
        var i;

        if(!isArray(vector0)) {
            throw new Error("RANK ERROR");
        }
        for(i = 0; i < vector0.length; i++) {
            if(isArray(vector0[i])) {
                throw new Error("RANK ERROR");
            } else if(!fn(vector0[i])) {
                throw new Error("DOMAIN ERROR");
            }
        }
    }

    function checkArrayByFunction(array0, errorMsg, fn) {
        var i;

        if(isArray(array0)) {
            for(i = 0; i < array0.length; i++) {
                checkArrayByFunction(array0[i], errorMsg, fn);
            }
        } else {
            if(!fn(array0)) {
                throw new Error(errorMsg);
            }
        }
    }

    function transpose(array1) {
        var result = [];

        function walk(array1, indexVector) {
            var i;

            if(isArray(array1)) {
                for(i = 0; i < array1.length; i++) {
                    walk(array1[i], indexVector.concat([i]));
                }
            } else {
                setIndex(result, indexVector.reverse(), array1);
            }
        }

        if(isArray(array1)) {
            walk(array1, []);
            return result;
        } else {
            return array1;
        }
    }

    function substituteArray(vector, array1) {
        var result = [],
            vec = isArray(vector) ? vector : [vector],
            rankVector = rho(array1),
            inIndices = [],
            max;

        function checkVector(vector) {
            var i,
                j,
                max = 0;

            for(i = 0; i < vector.length; i++) {
                if(isArray(vector[i])) {
                    throw new Error("RANK ERROR");
                } else if(!isInteger(vector[i])) {
                    throw new Error("DOMAIN ERROR");
                }
                max = max < vector[i] ? vector[i] : max;
            }

            if(max <= 0 || max > vector.length) {
                throw new Error("DOMAIN ERROR");
            }

            outer: for(i = 1; i <= max; i++) {
                for(j = 0; j < vector.length; j++) {
                    if(vector[j] === i) {
                        continue outer;
                    }
                }
                throw new Error("DOMAIN ERROR");
            }
            return max;
        }

        function subst(outIndices) {
            var i,
                j,
                dest;

            if(outIndices.length === max) {
                setIndex(result, outIndices, getIndex(array1, inIndices));
            } else {
                dest = vec.indexOf(outIndices.length + 1);
                for(i = 0; i < rankVector[dest]; i++) {
                    for(j = 0; j < vec.length; j++) {
                        if(vec[j] === outIndices.length + 1) {
                            inIndices[j] = i;
                        }
                    }
                    subst(outIndices.concat([i]));
                }
            }
        }

        max = checkVector(vec);
        if(vec.length !== rankVector.length) {
            throw new Error("LENGTH ERROR");
        } else if(rankVector.length === 0) {
            return array1;
        }
        subst([]);
        return result;
    }

    function foldOperator(operator) {
        return function(axis) {
            if(axis !== null && !isInteger(axis)) {
                throw new Error("AXIS ERROR");
            }

            return function(array1) {
                var rhoVector = rho(array1),
                    destAxis;

                function foldop(array0, level) {
                    var i,
                        result;

                    if(!isArray(array0)) {
                        return array0;
                    } else if(level === destAxis) {
                        for(i = 0; i < array0.length; i++) {
                            if(i > 0) {
                                result = operator(result, foldop(array0[i], level + 1));
                            } else {
                                result = foldop(array0[i], level + 1);
                            }
                        }
                    } else {
                        result = [];
                        for(i = 0; i < array0.length; i++) {
                            result[i] = foldop(array0[i], level + 1);
                        }
                    }
                    return result;
                }

                if(!isArray(array1)) {
                    return array1;
                } else if(array1.length === 0) {
                    return 0;
                } else {
                    destAxis = axis === null ? rho(rhoVector)[0] : axis;
                    if(!isInteger(destAxis) || destAxis < 1 || destAxis > rhoVector.length) {
                        throw new Error("AXIS ERROR");
                    }
                    return foldop(array1, 1);
                }
            };
        };
    }

    function scanOperator(operator) {
        return function(axis) {
            if(axis !== null && !isInteger(axis)) {
                throw new Error("AXIS ERROR");
            }

            return function(array1) {
                var rhoVector = rho(array1),
                    destAxis;

                function foldop(array0, level) {
                    var i,
                        result;

                    if(!isArray(array0)) {
                        return array0;
                    } else if(level === destAxis) {
                        result = [];
                        for(i = 0; i < array0.length; i++) {
                            if(i > 0) {
                                result[i] = operator(result[i - 1], foldop(array0[i], level + 1));
                            } else {
                                result[i] = foldop(array0[i], level + 1);
                            }
                        }
                    } else {
                        result = [];
                        for(i = 0; i < array0.length; i++) {
                            result[i] = foldop(array0[i], level + 1);
                        }
                    }
                    return result;
                }

                if(!isArray(array1)) {
                    return array1;
                } else if(array1.length === 0) {
                    return [];
                } else {
                    destAxis = axis === null ? rho(rhoVector)[0] : axis;
                    if(!isInteger(destAxis) || destAxis < 1 || destAxis > rhoVector.length) {
                        throw new Error("AXIS ERROR");
                    }
                    return foldop(array1, 1);
                }
            };
        };
    }

    function compressArray(vector, array1, axis) {
        var rhoVector,
            destAxis;

        function comp(array0, level) {
            var result = [],
                i;

            if(!isArray(array0)) {
                return array0;
            } else if(level === destAxis) {
                if(vector.length !== array0.length) {
                    throw new Error("LENGTH ERROR");
                }
                for(i = 0; i < vector.length; i++) {
                    if(vector[i] !== 0) {
                        result.push(comp(array0[i], level + 1));
                    }
                }
            } else {
                for(i = 0; i < array0.length; i++) {
                    result[i] = comp(array0[i], level + 1);
                }
            }
            return result;
        }

        function compScalar(scalar) {
            var result = [],
                i;

            for(i = 0; i < vector.length; i++) {
                if(vector[i] !== 0) {
                    result.push(scalar);
                }
            }
            return result;
        }

        function replicate(array0, times, level) {
            var result = [],
                i,
                j;

            if(!isArray(array0)) {
                return array0;
            } else if(level === destAxis) {
                for(i = 0; i < array0.length; i++) {
                    for(j = 0; j < times; j++) {
                        result[i * times + j] = replicate(array0[i], times, level + 1);
                    }
                }
            } else {
                for(i = 0; i < array0.length; i++) {
                    result[i] = replicate(array0[i], times, level + 1);
                }
            }
            return result;
        }

        function replicateScalar(scalar, times) {
            var result = [],
                i;

            for(i = 0; i < times; i++) {
                result.push(scalar);
            }
            return result;
        }

        if(axis !== null && !isInteger(axis)) {
            throw new Error("AXIS ERROR");
        } else if(vector.length === 0 && array1.length === 0) {
            return [];
        } else if(isNumber(vector)) {
            if(!isArray(array1)) {
                return replicateScalar(array1, vector);
            } else if(array1.length === 0) {
                return [];
            } else {
                rhoVector = rho(array1);
                destAxis = axis === null ? rho(rhoVector)[0] : axis;
                if(!isInteger(destAxis) || destAxis < 1 || destAxis > rhoVector.length) {
                    throw new Error("AXIS ERROR");
                }
                return replicate(array1, vector, 1);
            }
        } else {
            checkVectorByFunction(vector, function(x) { return true; });
            if(!isArray(array1)) {
                return compScalar(array1);
            } else if(array1.length === 0) {
                throw new Error("LENGTH ERROR");
            } else {
                rhoVector = rho(array1);
                destAxis = axis === null ? rho(rhoVector)[0] : axis;
                if(!isInteger(destAxis) || destAxis < 1 || destAxis > rhoVector.length) {
                    throw new Error("AXIS ERROR");
                }
                return comp(array1, 1);
            }
        }
    }

    function padArray(rhoVector, level, type) {
        var result = [],
            i;

        if(level === rhoVector.length) {
            return isNumber(type) ? 0 : " ";
        } else {
            for(i = 0; i < rhoVector[level]; i++) {
                result[i] = padArray(rhoVector, level + 1, type[0]);
            }
            return result;
        }
    }

    function expandArray(vector, array1, axis) {
        var rhoVector,
            rank,
            destAxis;

        function expand(array0, level) {
            var result = [],
                count = 0,
                i;

            if(!isArray(array0)) {
                return array0;
            } else if(level === destAxis) {
                for(i = 0; i < vector.length; i++) {
                    if(vector[i] !== 0) {
                        result.push(expand(array0[count], level + 1));
                        count++;
                    } else {
                        result.push(padArray(rhoVector, level, array0[0]));
                    }
                }
                if(count !== array0.length) {
                    throw new Error("LENGTH ERROR");
                }
            } else {
                for(i = 0; i < array0.length; i++) {
                    result[i] = expand(array0[i], level + 1);
                }
            }
            return result;
        }

        function expandScalar(scalar) {
            var result = [],
                i;

            for(i = 0; i < vector.length; i++) {
                if(vector[i] !== 0) {
                    result.push(scalar);
                } else if(isNumber(scalar)) {
                    result.push(0);
                } else {
                    result.push(" ");
                }
            }
            return result;
        }

        checkVectorByFunction(vector, function(x) { return true; });
        if(axis !== null && !isInteger(axis)) {
            throw new Error("AXIS ERROR");
        } else if(!isArray(array1)) {
            return expandScalar(array1);
        } else if(vector.length === 0 && array1.length === 0) {
            return [];
        } else if(array1.length === 0) {
            throw new Error("LENGTH ERROR");
        } else {
            rhoVector = rho(array1);
            rank = rho(rhoVector)[0];
            destAxis = axis === null ? rank : axis;
            if(!isInteger(destAxis) || destAxis < 1 || destAxis > rhoVector.length) {
                throw new Error("AXIS ERROR");
            }
            return expand(array1, 1);
        }
    }

    function rotateArray(array1, array2, axis) {
        var rhoVector,
            rank,
            destAxis,
            arrayFixed2 = isArray(array2) ? array2 : [array2],
            result = [];

        function rotate1(indices, rotatedNum) {
            var i,
                inIndices,
                indicesSet,
                rotated;

            inIndices = indices.slice();
            inIndices.splice(destAxis - 1, 0, 0);

            rotated = rotatedNum;
            if(!isNumber(rotated)) {
                throw new Error("DOMAIN ERROR");
            }
            rotated = rotated < 0 ? (rotated % rhoVector[destAxis - 1]) + rhoVector[destAxis - 1] : rotated;
            inIndices[destAxis - 1] = rotated;
            if(inIndices[destAxis - 1] >= rhoVector[destAxis - 1]) {
                inIndices[destAxis - 1] -= rhoVector[destAxis - 1];
            }

            indicesSet = indices.slice();
            indicesSet.splice(destAxis - 1, 0, 0);
            for(i = 0; i < rhoVector[destAxis - 1]; i++) {
                indicesSet[destAxis - 1] = i;
                setIndex(result, indicesSet, getIndex(arrayFixed2, inIndices));
                inIndices[destAxis - 1]++;
                if(inIndices[destAxis - 1] >= rhoVector[destAxis - 1]) {
                    inIndices[destAxis - 1] -= rhoVector[destAxis - 1];
                }
            }
        }

        function rotate(indices, level) {
            var i;

            if(level > rank) {
                rotate1(indices, getIndex(array1, indices));
            } else if(level === destAxis) {
                rotate(indices, level + 1);
            } else {
                for(i = 0; i < rhoVector[level - 1]; i++) {
                    rotate(indices.concat([i]), level + 1);
                }
            }
        }

        function rotateScalar(indices, level) {
            var i,
                inIndices,
                indicesSet,
                rotated;

            if(level > rank) {
                rotate1(indices, array1);
            } else if(level === destAxis) {
                rotateScalar(indices, level + 1);
            } else {
                for(i = 0; i < rhoVector[level - 1]; i++) {
                    rotateScalar(indices.concat([i]), level + 1);
                }
            }
        }

        function checkLength(rhoVector1, rhoVector2, level) {
            if(rhoVector1.length === 0) {
                return;
            } else if(level === destAxis) {
                checkLength(rhoVector1, rhoVector2.slice(1), level + 1);
            } else if(rhoVector1[0] === rhoVector2[0]) {
                checkLength(rhoVector1.slice(1), rhoVector2.slice(1), level + 1);
            } else {
                throw new Error("LENGTH ERROR");
            }
        }

        if(axis !== null && !isInteger(axis)) {
            throw new Error("AXIS ERROR");
        } else if(!isArray(array1)) {
            if(!isArray(array2)) {
                return array2;
            } else if(array2.length === 0) {
                return [];
            }
            rhoVector = rho(arrayFixed2);
            rank = rho(rhoVector)[0];
            destAxis = axis === null ? rank : axis;
            if(!isInteger(destAxis) || destAxis < 1 || destAxis > rhoVector.length) {
                throw new Error("AXIS ERROR");
            }
            rotateScalar([], 1);
            return result;
        } else {
            rhoVector = rho(arrayFixed2);
            rank = rho(rhoVector)[0];
            if(rank !== rho(rho(array1))[0] + 1) {
                throw new Error("RANK ERROR");
            }
            destAxis = axis === null ? rank : axis;
            if(!isInteger(destAxis) || destAxis < 1 || destAxis > rhoVector.length) {
                throw new Error("AXIS ERROR");
            }
            checkLength(rho(array1), rhoVector, 1);
            rotate([], 1);
            return result;
        }
    }

    function reverseArray(array1, axis) {
        var rhoVector,
            rank,
            destAxis,
            result = [];

        function rev(array0, level) {
            var result = [],
                i;

            if(!isArray(array0)) {
                return array0;
            } else if(level === destAxis) {
                for(i = 0; i < array0.length; i++) {
                    result[array0.length - i - 1] = rev(array0[i], level + 1);
                }
            } else {
                for(i = 0; i < array0.length; i++) {
                    result[i] = rev(array0[i], level + 1);
                }
            }
            return result;
        }

        if(axis !== null && !isInteger(axis)) {
            throw new Error("AXIS ERROR");
        } else if(!isArray(array1)) {
            return array1;
        } else {
            rhoVector = rho(array1);
            rank = rho(rhoVector)[0];
            destAxis = axis === null ? rank : axis;
            if(!isInteger(destAxis) || destAxis < 1 || destAxis > rhoVector.length) {
                throw new Error("AXIS ERROR");
            }
            return rev(array1, 1);
        }
    }

    function toVector(array1) {
        function toVec(array0) {
            var result,
                i;

            if(isArray(array0)) {
                result = [];
                for(i = 0; i < array0.length; i++) {
                    result = result.concat(toVec(array0[i]));
                }
                return result;
            } else {
                return [array0];
            }
        }
        return toVec(array1);
    }

    function concatenateArray(array1, array2, axis) {
        var rhoVector,
            rank,
            destAxis,
            result;

        function copy(array1) {
            var result = [],
                i;

            if(isArray(array1)) {
                for(i = 0; i < array1.length; i++) {
                    result[i] = copy(array1[i]);
                }
                return result;
            } else {
                return array1;
            }
        }

        function concat(array1, array2, level) {
            var result = [],
                count,
                rhoArray1 = rho(array1),
                rhoArray2 = rho(array2),
                i;

            if(level === destAxis) {
                if(!isArray(array1)) {
                    return concatScalar(array1, array2, level);
                } else if(!isArray(array2)) {
                    return concatScalarRight(array1, array2, level);
                }
                count = 0;
                if(rhoArray1.length === rhoArray2.length) {
                    for(i = 0; i < array1.length; i++, count++) {
                        result[count] = copy(array1[i]);
                    }
                    for(i = 0; i < array2.length; i++, count++) {
                        result[count] = copy(array2[i]);
                    }
                } else if(rhoArray1.length + 1 === rhoArray2.length) {
                    result[0] = copy(array1);
                    for(i = 0; i < array2.length; i++) {
                        result[i + 1] = copy(array2[i]);
                    }
                } else if(rhoArray1.length === rhoArray2.length + 1) {
                    for(i = 0; i < array1.length; i++) {
                        result[i] = copy(array1[i]);
                    }
                    result[i] = copy(array2);
                } else {
                    throw new Error("RANK ERROR");
                }
            } else if(level > destAxis) {
                if(rhoArray1.length !== rhoArray2.length) {
                    throw new Error("RANK ERROR");
                } else if(array1.length !== array2.length) {
                    throw new Error("LENGTH ERROR");
                }
                result = [copy(array1)].concat([copy(array2)]);
            } else {
                if(array1.length !== array2.length) {
                    throw new Error("LENGTH ERROR");
                }
                for(i = 0; i < array2.length; i++) {
                    result[i] = concat(array1[i], array2[i], level + 1);
                }
            }
            return result;
        }

        function copyScalar(level, scalar) {
            var result = [],
                i;

            if(level - 1 < rhoVector.length) {
                for(i = 0; i < rhoVector[level - 1]; i++) {
                    result[i] = copyScalar(level + 1, scalar);
                }
                return result;
            } else {
                return scalar;
            }
        }

        function concatScalar(scalar, array2, level) {
            var result = [],
                i;

            if(level === destAxis) {
                result[0] = copyScalar(level + 1, scalar);
                for(i = 0; i < array2.length; i++) {
                    result[i + 1] = copy(array2[i]);
                }
            } else if(level > destAxis) {
                result = [copyScalar(level, scalar)].concat([copy(array2)]);
            } else {
                for(i = 0; i < array2.length; i++) {
                    result[i] = concatScalar(scalar, array2[i], level + 1);
                }
            }
            return result;
        }

        function concatScalarRight(array1, scalar, level) {
            var result = [],
                i;

            if(level === destAxis) {
                for(i = 0; i < array1.length; i++) {
                    result[i] = copy(array1[i]);
                }
                result[i] = copyScalar(level + 1, scalar);
            } else if(level > destAxis) {
                result = [copy(array1)].concat([copyScalar(level, scalar)]);
            } else {
                for(i = 0; i < array1.length; i++) {
                    result[i] = concatScalarRight(array1[i], scalar, level + 1);
                }
            }
            return result;
        }

        if(axis !== null && axis <= 0) {
            throw new Error("AXIS ERROR");
        } else if(!isArray(array2)) {
            if(array1.length === 0) {
                return array2;
            }
            rhoVector = rho(array1);
            rank = rho(rhoVector)[0];
            destAxis = axis === null ? rank : axis;
            result = concatScalarRight(array1, array2, 1);
        } else if(!isArray(array1)) {
            if(array2.length === 0) {
                return array1;
            }
            rhoVector = rho(array2);
            rank = rho(rhoVector)[0];
            destAxis = axis === null ? rank : axis;
            result = concatScalar(array1, array2, 1);
        } else if(array1.length === 0) {
            return array2;
        } else if(array2.length === 0) {
            return array1;
        } else {
            rhoVector = rho(array2);
            rank = rho(rhoVector)[0];
            destAxis = axis === null ? rank : axis;
            result = isArray(array1) ? concat(array1, array2, 1) : concatScalar(array2, 1);
        }

        checkProperArray(result);
        return result;
    }

    function pickUpArray(array1, pickUpIndices) {
        function arrayIndices(array0, pickupArray, indices) {
            var result,
                i;

            if(!isArray(pickupArray)) {
                if(!isInteger(pickupArray) || pickupArray < 1 || pickupArray > array0.length) {
                    throw new Error("INDEX ERROR");
                }
                return pickUp(array0[pickupArray - 1], indices);
            } else {
                result = [];
                for(i = 0; i < pickupArray.length; i++) {
                    result[i] = arrayIndices(array0, pickupArray[i], indices);
                }
                return result;
            }
        }

        function pickUp(array0, indices) {
            var result,
                i;

            if(!isArray(array0)) {
                return array0;
            } else if(isNumber(indices[0])) {
                if(!isInteger(indices[0]) || indices[0] < 1 || indices[0] > array0.length) {
                    throw new Error("INDEX ERROR");
                }
                return pickUp(array0[indices[0] - 1], indices.slice(1));
            } else if(indices[0] === null) {
                result = [];
                for(i = 0; i < array0.length; i++) {
                    result[i] = pickUp(array0[i], indices.slice(1));
                }
                return result;
            } else if(isArray(indices[0])) {
                return arrayIndices(array0, indices[0], indices.slice(1));
            } else {
                throw new Error("DOMAIN ERROR");
            }
        }

        if(!isArray(array1)) {
            return pickUp([array1], pickUpIndices);
        } else if(array1.length === 0) {
            throw new Error("INDEX ERROR");
        } else if(rho(array1).length !== pickUpIndices.length) {
            throw new Error("RANK ERROR");
        } else {
            return pickUp(array1, pickUpIndices);
        }
    }

    function assignArray(array1, lval, rval) {
        function assign(leftIndices, lval, rval) {
            var lvalue,
                i;

            if(isArray(lval) && lval.length === 0) {
                if(isArray(rval)) {
                    throw new Error("RANK ERROR");
                }
                setIndex(array1, leftIndices, rval);
            } else if(isNumber(lval[0])) {
                lvalue = getIndex(array1, leftIndices);
                if(!isArray(lvalue)) {
                    throw new Error("RANK ERROR");
                } else if(!isInteger(lval[0]) || lval[0] < 1 || lval[0] > array1.length) {
                    throw new Error("INDEX ERROR");
                }
                return assign(leftIndices.concat([lval[0] - 1]), lval.slice(1), rval);
            } else if(lval[0] === null) {
                lvalue = getIndex(array1, leftIndices);
                if(!isArray(lvalue) || !isArray(rval)) {
                    throw new Error("RANK ERROR");
                } else if(lvalue.length !== rval.length) {
                    throw new Error("LENGTH ERROR");
                }
                for(i = 0; i < rval.length; i++) {
                    assign(leftIndices.concat([i]), lval.slice(1), rval[i]);
                }
            } else if(isArray(lval[0])) {
                lvalue = getIndex(array1, leftIndices);
                if(!isArray(lvalue) || !isArray(rval)) {
                    throw new Error("RANK ERROR");
                } else if(lval[0].length !== rval.length) {
                    throw new Error("LENGTH ERROR");
                }
                for(i = 0; i < rval.length; i++) {
                    assign(leftIndices.concat([lval[0][i] - 1]), lval.slice(1), rval[i]);
                }
            } else {
                throw new Error("DOMAIN ERROR");
            }
        }

        if(!isArray(array1)) {
            throw new Error("RANK ERROR");
        } else if(array1.length === 0) {
            return array1;
        } else {
            assign([], lval, rval);
            return rval;
        }
    }

    function takeArray(vector1, array1) {
        var rhoVector,
            vectorFixed1 = isArray(vector1) ? vector1 : [vector1],
            arrayFixed1 = isArray(array1) ? array1 : [array1];

        function pad(type, length) {
            var result = [],
                i;

            if(isArray(type)) {
                for(i = 0; i < length; i++) {
                    result[i] = pad(type[0], length);
                }
                return result;
            } else {
                return isNumber(type) ? 0 : " ";
            }
        }

        function take(array0, level) {
            function arr(iStart, iEnd) {
                var result = [],
                    i;

                for(i = 0; i < iEnd - iStart; i++) {
                    if(i + iStart >= 0 && i + iStart < array0.length) {
                        result[i] = take(array0[i + iStart], level + 1);
                    } else {
                        result[i] = pad(array0[0], iEnd - iStart);
                    }
                }
                return result;
            }

            if(!isArray(array0)) {
                return array0;
            } else if(!isInteger(vectorFixed1[level - 1])) {
                throw new Error("DOMAIN ERROR");
            } else if(level - 1 >= vectorFixed1.length) {
                throw new Error("LENGTH ERROR");
            } else if(vectorFixed1[level - 1] > 0) {
                return arr(0, vectorFixed1[level - 1]);
            } else if(vectorFixed1[level - 1] === 0) {
                return arr(0, array0.length);
            } else {
                return arr(array0.length + vectorFixed1[level - 1], array0.length);
            }
        }

        checkVectorByFunction(vectorFixed1, function(x) {
            return isInteger(x);
        });
        if(arrayFixed1.length === 0) {
            return [];
        } else if(vectorFixed1.length === 0) {
            return array1;
        } else {
            rhoVector = rho(arrayFixed1);
            if(vectorFixed1.length !== rhoVector.length) {
                throw new Error("LENGTH ERROR");
            }
            return take(arrayFixed1, 1);
        }
    }

    function dropArray(vector1, array1) {
        var vectorFixed1 = isArray(vector1) ? vector1 : [vector1],
            arrayFixed1 = isArray(array1) ? array1 : [array1];

        function drop(array0, level) {
            function arr(iStart, iEnd) {
                var result = [],
                    i;

                for(i = 0; i < iEnd - iStart; i++) {
                    result[i] = drop(array0[i + iStart], level + 1);
                    if(isArray(result[i]) && result[i].length === 0) {
                        return [];
                    }
                }
                return result;
            }

            if(!isArray(array0)) {
                return array0;
            } else if(level - 1 >= vectorFixed1.length) {
                throw new Error("LENGTH ERROR");
            } else if(!isInteger(vectorFixed1[level - 1])) {
                throw new Error("DOMAIN ERROR");
            } else if(vectorFixed1[level - 1] >= array0.length) {
                return [];
            } else if(vectorFixed1[level - 1] > 0) {
                return arr(vectorFixed1[level - 1], array0.length);
            } else if(vectorFixed1[level - 1] === 0) {
                return arr(0, array0.length);
            } else {
                return arr(0, array0.length + vectorFixed1[level - 1]);
            }
        }

        checkVectorByFunction(vectorFixed1, function(x) {
            return isInteger(x);
        });
        if(arrayFixed1.length === 0) {
            return [];
        } else if(vectorFixed1.length === 0) {
            return array1;
        } else {
            if(vectorFixed1.length !== rho(arrayFixed1).length) {
                throw new Error("LENGTH ERROR");
            }
            return drop(arrayFixed1, 1);
        }
    }

    function belongToArray(array1, array2) {
        function isElement(element) {
            function elem(array0) {
                var i;

                if(isArray(array0)) {
                    for(i = 0; i < array0.length; i++) {
                        if(elem(array0[i])) {
                            return 1;
                        }
                    }
                    return 0;
                } else {
                    return element === array0;
                }
            }
            return elem(array2);
        }

        if(!isArray(array1)) {
            return isElement(array1) ? 1 : 0;
        } else {
            return map(array1, isElement);
        }
    }

    function sortVector(vector1, desc) {
        var sorted,
            vector0,
            i;

        checkVectorByFunction(vector1, function(x) { return true; });
        if(!isArray(vector1)) {
            return [];
        } else {
            sorted = vector1.slice().sort(function(x, y) {
                var comp = x < y ? -1 : x > y ? 1 : 0;

                return desc ? -comp : comp;
            });
            vector0 = vector1.slice();
            for(i = 0; i < sorted.length; i++) {
                sorted[i] = vector0.indexOf(sorted[i]) + 1;
                vector0[sorted[i] - 1] = null;
            }
            return sorted;
        }
    }

    function decodeArray(array1, array2) {
        var result = [],
            rhoArray1,
            rhoArray2,
            rhoArray2a;

        function decode(indicesArray1, rhoArray1, indicesArray2, rhoArray2) {
            var fold1,
                i,
                maxRepeat,
                base,
                val;

            if(rhoArray1.length > 1) {
                for(i = 0; i < rhoArray1[0]; i++) {
                    decode(indicesArray1.concat([i]), rhoArray1.slice(1), indicesArray2, rhoArray2);
                }
            } else if(rhoArray2.length > 0) {
                for(i = 0; i < rhoArray2[0]; i++) {
                    decode(indicesArray1, rhoArray1, indicesArray2.concat([i]), rhoArray2.slice(1));
                }
            } else {
                fold1 = val = getIndex(array2, [0].concat(indicesArray2));
                maxRepeat = Math.max(rhoArray2a, rhoArray1[0]);
                for(i = 1; i < maxRepeat; i++) {
                    if(i < rhoArray1[0]) {
                        base = getIndex(array1, indicesArray1.concat([i]));
                    }
                    if(i < rhoArray2a) {
                        val = getIndex(array2, [i].concat(indicesArray2));
                    }
                    fold1 = fold1 * base + val;
                }
                if(indicesArray1.length + indicesArray2.length > 0) {
                    setIndex(result, indicesArray1.concat(indicesArray2), fold1);
                } else {
                    result = fold1;
                }
            }
        }

        function decodeScalar(array1, scalar) {
            var result = [],
                fold,
                i;

            if(isArray(array1[0])) {
                for(i = 0; i < array1.length; i++) {
                    result[i] = decodeScalar(array1[i], scalar);
                }
                return result;
            } else {
                fold = 0;
                for(i = 0; i < array1.length; i++) {
                    fold = scalar + array1[i] * fold;
                }
                return fold;
            }
        }

        function decodeScalarLeft(scalar, indicesArray2, rhoArray2) {
            var fold1,
                i,
                val;

            if(rhoArray2.length > 0) {
                for(i = 0; i < rhoArray2[0]; i++) {
                    decodeScalarLeft(scalar, indicesArray2.concat([i]), rhoArray2.slice(1));
                }
            } else {
                fold1 = val = getIndex(array2, [0].concat(indicesArray2));
                for(i = 1; i < rhoArray2a; i++) {
                    if(i < rhoArray2a) {
                        val = getIndex(array2, [i].concat(indicesArray2));
                    }
                    fold1 = fold1 * scalar + val;
                }
                if(indicesArray2.length > 0) {
                    setIndex(result, indicesArray2, fold1);
                } else {
                    result = fold1;
                }
            }
        }

        checkArrayByFunction(array1, "DOMAIN ERROR", function(x) { return isNumber(x); });
        checkArrayByFunction(array2, "DOMAIN ERROR", function(x) { return isNumber(x); });
        if(!isArray(array1) && !isArray(array2)) {
            return array2;
        } else if(!isArray(array1)) {
            if(array2.length === 0) {
                return [];
            }
            rhoArray2 = rho(array2);
            rhoArray2a = rhoArray2[0];
            decodeScalarLeft(array1, [], rhoArray2.slice(1));
            return result;
        } else if(isArray(array2)) {
            if(array1.length === 0 || array2.length === 0) {
                return [];
            }
            rhoArray1 = rho(array1);
            rhoArray2 = rho(array2);
            rhoArray2a = rhoArray2[0];
            decode([], rhoArray1, [], rhoArray2.slice(1));
            return result;
        } else {
            if(array1.length === 0) {
                return [];
            }
            return decodeScalar(array1, array2);
        }
    }

    function encodeArray(array1, array2) {
        var result = [],
            arrayFixed2 = isArray(array2) ? array2 : [array2],
            rhoArray2 = rho(arrayFixed2);

        function encode(array0) {
            var result = [],
                rhoArray0 = rho(array0),
                i;

            function inner1(indicesArray0, indicesArray2) {
                var i,
                    enc,
                    base;

                if(indicesArray2.length < rhoArray2.length) {
                    for(i = 0; i < rhoArray2[indicesArray2.length]; i++) {
                        inner1(indicesArray0, indicesArray2.concat([i]));
                    }
                } else {
                    if(rhoArray0[0] !== arrayFixed2.length) {
                        throw new Error("LENGTH ERROR");
                    }
                    enc = getIndex(arrayFixed2, indicesArray2);
                    for(i = rhoArray0[0] - 1; i >= 0; i--) {
                        base = getIndex(array0, [i].concat(indicesArray0));
                        setIndex(result, [i].concat(indicesArray0).concat(indicesArray2), enc % base);
                        enc = Math.floor(enc / base);
                    }
                }
            }

            if(!isArray(array0)) {
                return encode([array0]);
            } else if(!isArray(array0[0])) {
                inner1([], []);
            } else if(!isArray(array0[0][0])) {
                for(i = 0; i < array0[0].length; i++) {
                    inner1([i], []);
                }
            } else {
                for(i = 0; i < array0.length; i++) {
                    result[i] = encode(array0[i]);
                }
            }
            return result;
        }

        function encodeScalar(array0) {
            var result = [],
                i;

            if(isArray(array0)) {
                for(i = 0; i < array0.length; i++) {
                    result[i] = encodeScalar(array0[i]);
                }
                return result;
            } else {
                return array0 % array1;
            }
        }

        function encodeScalarRight(array0) {
            var result = [],
                rhoArray0 = rho(array0),
                i;

            function inner1(indicesArray0, indicesArray2) {
                var i,
                    enc,
                    base;

                enc = array2;
                for(i = rhoArray0[0] - 1; i >= 0; i--) {
                    base = getIndex(array0, [i].concat(indicesArray0));
                    setIndex(result, [i].concat(indicesArray0), enc % base);
                    enc = Math.floor(enc / base);
                }
            }

            if(!isArray(array0)) {
                throw new Error("Internal error");
            } else if(!isArray(array0[0])) {
                inner1([]);
            } else if(!isArray(array0[0][0])) {
                for(i = 0; i < array0[0].length; i++) {
                    inner1([i]);
                }
            } else {
                for(i = 0; i < array0.length; i++) {
                    result[i] = encodeScalarRight(array0[i]);
                }
            }
            return result;
        }

        checkArrayByFunction(array1, "DOMAIN ERROR", function(x) { return isNumber(x); });
        checkArrayByFunction(arrayFixed2, "DOMAIN ERROR", function(x) { return isNumber(x); });
        if(!isArray(array1)) {
            return encodeScalar(array2);
        } else if(!isArray(array2)) {
            return encodeScalarRight(array1);
        } else {
            return encode(array1);
        }
    }

    function toStringArray(array1, format) {
        function toStringStd(array0) {
            var result = [],
                resultString,
                i;

            if(!isArray(array0)) {
                if(!isNumber(array0)) {
                    throw new Error("DOMAIN ERROR");
                }
                resultString = array0.toString();
                resultString = resultString.replace(/-/, "￣");
                resultString = resultString.replace(/e\+?/, "E");
                return stringToCharArray(resultString);
            } else if(!isArray(array0[0])) {
                for(i = 0; i < array0.length; i++) {
                    if(i > 0) {
                        result = result.concat([" "]);
                    }
                    result = result.concat(toStringStd(array0[i]));
                }
            } else {
                for(i = 0; i < array0.length; i++) {
                    result[i] = toStringStd(array0[i]);
                }
            }
            return result;
        }

        function toStringFix(array0, total, ptr) {
            var result = [],
                resultString,
                resultLength,
                exponent,
                i;

            if(!isArray(array0)) {
                if(!isNumber(array0)) {
                    throw new Error("DOMAIN ERROR");
                }

                if(ptr < 0) {
                    exponent = getNumberExponent(array0);
                    resultString = exponent[0].toPrecision(-ptr) + "E" + exponent[1].toString();
                } else {
                    resultString = array0.toFixed(ptr);
                }

                if(total < 0) {
                    resultString = " " + resultString;
                } else if(resultString.length > total) {
                    throw new Error("DOMAIN ERROR");
                } else {
                    resultLength = resultString.length;
                    for(i = 0; i < total - resultLength; i++) {
                        resultString = " " + resultString;
                    }
                }
                resultString = resultString.replace(/-/, "￣");
                return stringToCharArray(resultString);
            } else if(!isArray(array0[0])) {
                for(i = 0; i < array0.length; i++) {
                    result = result.concat(toStringFix(array0[i], total, ptr));
                }
            } else {
                for(i = 0; i < array0.length; i++) {
                    result[i] = toStringFix(array0[i], total, ptr);
                }
            }
            return result;
        }

        if(isArray(array1) && array1.length === 0) {
            return [];
        } else if(format === null) {
            return toStringStd(array1);
        } else if(!isArray(format)) {
            return toStringFix(array1, -1, format);
        } else {
            if(isArray(format[0]) || isArray(format[1])) {
                throw new Error("RANK ERROR");
            } else if(!isNumber(format[0]) || !isNumber(format[1])) {
                throw new Error("DOMAIN ERROR");
            }
            return toStringFix(array1, format[0], format[1]);
        }
    }

    function iota(times, start, step) {
        var result = [],
            val = start,
            i;

        start = start === undef ? start : 1;
        step = step === undef ? step : 1;
        for(i = 0; i < times; i++, val += step) {
            result[i] = val;
        }
        return result;
    }

    function rho(anArray) {
        var result = [],
            a1 = anArray,
            i;

        for(i = 0; isArray(a1); i++, a1 = a1[0]) {
            result[i] = a1.length;
        }
        return result;
    }

    function map(anObject, action, validate) {
        var result = [],
            i;

        if(!isArray(anObject)) {
            if(validate && !validate(anObject)) {
                throw new Error("DOMAIN ERROR");
            }
            return action(anObject);
        }

        for(i = 0; i < anObject.length; i++) {
            result[i] = map(anObject[i], action, validate);
        }
        return result;
    }

    function map2(array1, array2, action, validate) {
        var result = [],
            i;

        if(!isArray(array1) && !isArray(array2)) {
            if(validate && (!validate(array1) || !validate(array2))) {
                throw new Error("DOMAIN ERROR");
            }
            return action(array1, array2);
        } else if(!(isArray(array1) && isArray(array2))) {
            throw new Error("RANK ERROR");
        } else if(array1.length !== array2.length) {
            throw new Error("LENGTH ERROR");
        } 

        for(i = 0; i < array1.length; i++) {
            result[i] = map2(array1[i], array2[i], action, validate);
        }
        return result;
    }

    function map2Scalar(object1, object2, action, validate) {
        if(isArray(object1) && !isArray(object2)) {
            return map(object1, function(x) {
                return action(x, object2);
            });
        } else if(!isArray(object1) && isArray(object2)) {
            return map(object2, function(x) {
                return action(object1, x);
            });
        } else if(!isArray(object1) && !isArray(object2)) {
            return action(object1, object2);
        } else {
            if(rho(rho(object1))[0] !== rho(rho(object2))[0]) {
                throw new Error("RANK ERROR");
            }
            return map2(object1, object2, action, validate);
        }
    }

    function outerProduct(fn) {
        return function(array1, array2) {
            function walk(array1) {
                var result = [],
                    i;

                if(isArray(array1)) {
                    for(i = 0; i < array1.length; i++) {
                        result[i] = walk(array1[i]);
                    }
                    return result;
                } else {
                    return map2Scalar(array1, array2, fn);
                }
            }
            return walk(array1);
        };
    }

    function mapSingle(vector, action) {
        var result = [],
            i;

        for(i = 0; i < vector.length; i++) {
            result[i] = action(vector[i]);
        }
        return result;
    }

    function fold(array1, action) {
        var result = null,
            i;

        for(i = 0; i < array1.length; i++) {
            result = result === null ? array1[i] : action(result, array1[i]);
        }
        return result;
    }


    function convertChar(program) {
        var result = program,
            PTN_KEYWORD = /('[^'\n]+')|(?:#([^#\n]+)#)/g;

        function convertASCII(entire, quote, keyword) {
            var result;

            if(quote) {
                return quote;
            } else {
                result = MAP_ASCII_STR[keyword];
                if(!result) {
                    throw new Error("Invalid keyword: " + keyword);
                }
                return result;
            }
        }

        result = result.replace(/　/g, " ");
        result = result.trim();
        result = mapHomomorphism(MAP_APL_CHAR, result);
        result = mapHomomorphism(MAP_FULLWIDTH, result);
        result = result.replace(PTN_KEYWORD, convertASCII);
        return result;
    }

    function parseAPL(program, env) {
        var NUMBER = /[▲￣]?[0-9]+(\.[0-9]+)?(E[0-9]+)?/g,
            STRING = /'[^'\n]*'/g,
            BLANK = /[ \t]+/g,
            VARIABLE = /[\x41-\x5a\u25b3\u3040-\u309f\u30a0-\u30fa\u30fc-\u30fe\u4e00-\u9fff\uff21-\uff3a\uff41-\uff5a\uff66-\uff9f][0-9\x41-\x5a\u25b3\u3040-\u309f\u30a0-\u30fa\u30fc-\u30fe\u4e00-\u9fff\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\uff66-\uff9f]*/g,
            ASSIGN = /←/,
            OUTERPRODUCT = /・./;

        function parseAPLFloat(x) {
            var repl = x;

            repl = repl.replace(/[▲￣]/, "-");
            return parseFloat(repl);
        }

        function getString(aString) {
            var result = [],
                i;

            for(i = 1; i < aString.length - 1; i++) {
                result[i - 1] = aString.charAt(i);
            }
            return result.length !== 1 ? result : result[0];
        }

        function getVariable(varName) {
            return varName;
        }

        function skipBlankIndex(index) {
            var result;

            BLANK.lastIndex = index;
            result = BLANK.exec(program);
            if(result && result.index === index) {
                return BLANK.lastIndex;
            } else {
                return index;
            }
        }

        function skipBlank(index, attr) {
            BLANK.lastIndex = index;
            result = BLANK.exec(program);
            if(result && result.index === index) {
                return {
                    lastIndex: BLANK.lastIndex,
                    attr: attr
                };
            } else {
                return {
                    lastIndex: index,
                    attr: attr
                };
            }
        }

        function parseRegex(regex, action, index, attr) {
            var result;

            regex.lastIndex = index;
            result = regex.exec(program);
            if(result && result.index === index) {
                return skipBlank(regex.lastIndex, action(result[0]));
            }
        }

        function walkOperator(index, attr) {
            var op2,
                ch;

            ch = program.charAt(index);
            if(operator[ch]) {
                if(index >= program.length || !(op2 = dyadic[program.charAt(index + 1)])) {
                    throw new Error("SYNTAX ERROR");
                }
                return walkOperator(skipBlankIndex(index + 2), operator[ch](attr, op2));
            } else {
                return skipBlank(index, attr);
            }
        }

        function walkFunction(index, attr) {
            var result,
                resultOp,
                resultAxis,
                outerOp,
                ch;

            if(index >= program.length) {
                return skipBlank(index, attr);
            }

            ch = program.charAt(index);
            if(ch === ")") {
                return skipBlank(skipBlankIndex(index + 1), attr);
            } else if(ch === "(") {
                return walk(index + 1, []);
            } else if(ch === "/") {
                resultAxis = walkFoldAxis(skipBlankIndex(index + 1));
                result = walk(resultAxis.lastIndex, []);
                return {
                    lastIndex: result.lastIndex,
                    attr: {
                        apply: [compressArray, attr, result.attr, resultAxis.attr]
                    }
                };
            } else if(ch === "\\") {
                resultAxis = walkFoldAxis(skipBlankIndex(index + 1));
                result = walk(resultAxis.lastIndex, []);
                return {
                    lastIndex: result.lastIndex,
                    attr: {
                        apply: [expandArray, attr, result.attr, resultAxis.attr]
                    }
                };
            } else if(ch === "φ") {
                resultAxis = walkFoldAxis(skipBlankIndex(index + 1));
                result = walk(resultAxis.lastIndex, []);
                return {
                    lastIndex: result.lastIndex,
                    attr: {
                        apply: [rotateArray, attr, result.attr, resultAxis.attr]
                    }
                };
            } else if(ch === ",") {
                resultAxis = walkFoldAxis(skipBlankIndex(index + 1));
                result = walk(resultAxis.lastIndex, []);
                return {
                    lastIndex: result.lastIndex,
                    attr: {
                        apply: [concatenateArray, attr, result.attr, resultAxis.attr]
                    }
                };
            } else if(dyadic[ch]) {
                resultOp = walkOperator(skipBlankIndex(index + 1), dyadic[ch]);
                result = walk(resultOp.lastIndex, []);
                return {
                    lastIndex: result.lastIndex,
                    attr: {
                        apply: [resultOp.attr, attr, result.attr]
                    }
                };
            } else if(OUTERPRODUCT.test(program.substring(index, index + 2))) {
                if(!(outerOp = dyadic[program.charAt(index + 2)])) {
                    throw new Error("SYNTAX ERROR");
                }
                result = walk(skipBlankIndex(index + 3), []);
                return {
                    lastIndex: result.lastIndex,
                    attr: {
                        apply: [outerProduct(outerOp), attr, result.attr]
                    }
                };
            } else {
                return skipBlank(index, attr);
            }
        }

        function walkAssign(index, attr) {
            var result,
                rval,
                varName;

            if(!(result = parseRegex(VARIABLE, K, index, attr))) {
                return null;
            }
            varName = result.attr;
            if(!ASSIGN.test(program.charAt(result.lastIndex))) {
                return null;
            }
            rval = walk(skipBlankIndex(result.lastIndex + 1), []);
            if(rval) {
                return skipBlank(rval.lastIndex, {
                    assign: {
                        name: result.attr,
                        val: rval.attr
                    }
                });
            } else {
                return null;
            }
        }

        function walkPickUpElement(index) {
            var result = [],
                result1,
                i;

            if(program.charAt(index) === ";") {
                result.push(null);
                result1 = {
                    lastIndex: index
                };
            } else if(!!(result1 = walk(index, []))) {
                result.push(result1.attr);
            } else {
                return null;
            }
            while(program.charAt(result1.lastIndex) === ";") {
                result1 = skipBlank(result1.lastIndex, result1.attr);
                if(/[;\]]/.test(program.charAt(result1.lastIndex + 1))) {
                    result.push(null);
                    result1 = skipBlank(result1.lastIndex + 1, result1.attr);
                } else if(!(result1 = walk(skipBlankIndex(result1.lastIndex + 1), []))) {
                    throw new Error("SYNTAX ERROR");
                } else {
                    result.push(result1.attr);
                }
            }

            for(i = 0; i < result.length; i++) {
                result[i] = execInternal(result[i], env);
            }
            return skipBlank(result1.lastIndex, result);
        }

        function walkPickUp(index, attr) {
            var result,
                index1;

            if(program.charAt(index) !== "[") {
                return null;
            }
            index1 = skipBlankIndex(index + 1);
            if(program.charAt(index1) === "]") {
                return {
                    lastIndex: skipBlankIndex(index1),
                    attr: attr.length > 1 ? attr : attr[0]
                }
            }
            result = walkPickUpElement(index1, attr);
            if(program.charAt(result.lastIndex) !== "]") {
                throw new Error("SYNTAX ERROR");
            }
            return skipBlank(skipBlankIndex(result.lastIndex + 1), {
                apply: [pickUpArray, attr.length > 1 ? attr : attr[0], result.attr]
            });
        }

        function walkVariablePickUp(index, attr) {
            var result,
                resultRval,
                varName,
                index1;

            if(!(result = parseRegex(VARIABLE, K, index, attr))) {
                return null;
            }
            varName = result.attr;

            if(program.charAt(result.lastIndex) !== "[") {
                return null;
            }
            result = walkPickUpElement(skipBlankIndex(result.lastIndex + 1), attr);
            if(program.charAt(result.lastIndex) !== "]") {
                throw new Error("SYNTAX ERROR");
            }

            index1 = skipBlankIndex(result.lastIndex + 1);
            if(ASSIGN.test(program.charAt(index1))) {
                index1 = skipBlankIndex(index1 + 1);
                resultRval = walk(index1, []);
                return skipBlank(result.lastIndex, {
                    apply: [assignArray, { variable: varName }, result.attr, resultRval.attr]
                });
            } else {
                return skipBlank(index1, {
                    apply: [pickUpArray, { variable: varName }, result.attr]
                });
            }
        }

        function walkAfterMonadic(index, attr) {
            var result,
                resultConcat,
                ch;

            ch = program.charAt(index);
            if(ch === "(") {
                result = walk(skipBlankIndex(index + 1), []);
                return walkAfterMonadic(result.lastIndex, attr.concat([result.attr]));
            } else if(!!(result = walkAssign(index, attr))) {
                return result;
            } else if(!!(result = walkPickUp(index, attr))) {
                return result;
            } else if(!!(result = walkVariablePickUp(index, attr))) {
                return walkFunction(result.lastIndex, result.attr);
            } else if(!!(result = parseRegex(NUMBER, parseAPLFloat, index, attr)) ||
                    !!(result = parseRegex(STRING, getString, index, attr))) {
                resultConcat = attr.concat([result.attr]);
                return walkAfterMonadic(result.lastIndex, resultConcat);
            } else if(!!(result = parseRegex(VARIABLE, getVariable, index, attr))) {
                resultConcat = attr.concat([{
                    variable: result.attr
                }]);
                return walkAfterMonadic(result.lastIndex, resultConcat);
            } else {
                if(attr.length === 0) {
                    throw new Error("SYNTAX ERROR");
                }
                return walkFunction(index, {
                    "createArray": attr.length > 1 ? attr : attr[0]
                });
            }
        }

        function walkFoldAxis(index) {
            var result;

            if(program.charAt(index) === "[") {
                result = walk(skipBlankIndex(index + 1), []);
                if(program.charAt(result.lastIndex) !== "]") {
                    throw new Error("SYNTAX ERROR");
                }
                return skipBlank(skipBlankIndex(result.lastIndex + 1), result.attr);
            } else {
                return skipBlank(index, null);
            }
        }

        function walkFold(index, attr) {
            var result;

            if(program.charAt(index) === "/") {
                result = walkFoldAxis(skipBlankIndex(index + 1));
                return {
                    lastIndex: result.lastIndex,
                    attr: execInternal({
                        apply: [foldOperator(attr), result.attr]
                    }, env)
                };
            } else if(program.charAt(index) === "\\") {
                result = walkFoldAxis(skipBlankIndex(index + 1));
                return {
                    lastIndex: result.lastIndex,
                    attr: execInternal({
                        apply: [scanOperator(attr), result.attr]
                    }, env)
                };
            } else {
                return null;
            }
        }

        function walk(index, attr) {
            var result,
                resultFold,
                resultAxis,
                resultEval,
                ch,
                toEval;

            if(index >= program.length) {
                return {
                    lastIndex: index,
                    attr: attr
                };
            }

            ch = program.charAt(index);
            if(dyadic[ch]) {
                resultFold = walkFold(skipBlankIndex(index + 1), dyadic[ch]);
                if(resultFold) {
                    result = walk(resultFold.lastIndex, []);
                    return {
                        lastIndex: result.lastIndex,
                        attr: {
                            apply: [resultFold.attr, result.attr]
                        }
                    };
                }
            }

            if(monadic[ch]) {
                result = walk(skipBlankIndex(index + 1), []);
                return {
                    lastIndex: result.lastIndex,
                    attr: {
                        apply: [monadic[ch], result.attr]
                    }
                };
            } else if(ch === "φ") {
                resultAxis = walkFoldAxis(skipBlankIndex(index + 1));
                result = walk(resultAxis.lastIndex, []);
                return {
                    lastIndex: result.lastIndex,
                    attr: {
                        apply: [reverseArray, result.attr, resultAxis.attr]
                    }
                };
            } else if(ch === "♪") {
                result = walk(skipBlankIndex(index + 1), []);
                return {
                    lastIndex: result.lastIndex,
                    attr: {
                        eval: result.attr
                    }
                };
            } else {
                return walkAfterMonadic(index, attr);
            }
        }
        return walk(0, []).attr;
    }

    function execInternal(internal, env) {
        var result,
            toApply,
            toEval,
            i;

        if(!isObject(internal) || isArray(internal)) {
            return internal;
        } else if(internal.apply !== undef) {
            toApply = [];
            for(i = internal.apply.length - 1; i >= 1; i--) {
                toApply[i - 1] = execInternal(internal.apply[i], env);
            }
            return internal.apply[0].apply(null, toApply);
        } else if(internal.variable !== undef) {
            if(env[internal.variable] === undef) {
                throw new Error("VALUE ERROR");
            }
            return env[internal.variable];
        } else if(internal.createArray !== undef) {
            if(isArray(internal.createArray)) {
                result = [];
                for(i = 0; i < internal.createArray.length; i++) {
                    result[i] = execInternal(internal.createArray[i], env);
                }
            } else {
                result = execInternal(internal.createArray, env);
            }
            checkProperArray(result, true);
            return result;
        } else if(internal.assign !== undef) {
            env[internal.assign.name] = execInternal(internal.assign.val, env);
            return env[internal.assign.name];
        } else if(internal.eval !== undef) {
            toEval = convertChar(charArrayToString(execInternal(internal.eval, env)));
            result = parseAPL(toEval, env);
            return execInternal(result);
        } else {
            throw new Error("Internal Error");
        }
    }

    function extractString(array0) {
        function extract(array0) {
            var result = [],
                i;

            if(isString(array0)) {
                if(array0.length > 1) {
                    return stringToCharArray(array0);
                } else if(array0.length === 1) {
                    return array0;
                } else {
                    return [];
                }
            } else if(isArray(array0)) {
                for(i = 0; i < array0.length; i++) {
                    result[i] = extract(array0[i]);
                }
                return result;
            } else {
                return array0;
            }
        }
        return extract(array0);
    }

    function checkProperArray(array0, allowEmpty) {
        function lengthArray(array0) {
            var length = -1,
                i;

            if(!isArray(array0)) {
                return 0;
            } else {
                if(!allowEmpty && array0.length === 0) {
                    throw new Error("DOMAIN ERROR");
                }
                for(i = 0; i < array0.length; i++) {
                    if(length < 0) {
                        length = lengthArray(array0[i]);
                    } else if(lengthArray(array0[i]) !== length) {
                        throw new Error("LENGTH ERROR");
                    }
                }
                return array0.length;
            }
        }

        function notMixedArray(array0) {
            var type = null;

            function walk(array0) {
                var i;

                if(isArray(array0)) {
                    for(i = 0; i < array0.length; i++) {
                        walk(array0[i]);
                    }
                } else if(type === null) {
                    type = typeof array0;
                } else if(type !== typeof array0) {
                    throw new Error("DOMAIN ERROR");
                }
            }
            walk(array0);
        }

        if(isArray(array0)) {
            if(!allowEmpty && array0.length === 0) {
                throw new Error("DOMAIN ERROR");
            }
            lengthArray(array0);
            notMixedArray(array0);
        } else if(!(isNumber(array0) || isString(array0))) {
            throw new Error("DOMAIN ERROR");
        }
    }

    function createEnv(env) {
        var innerEnv = env ? deepcopy(env) : {},
            me;

        me = {
            put: function(name, anObject) {
                var source = extractString(anObject);

                checkProperArray(source);
                env[name] = source;
            },

            eval: function(program) {
                var converted,
                    internal;

                converted = convertChar(program);
                internal = parseAPL(converted, innerEnv);
                return execInternal(internal, innerEnv);
            }
        };
        return me;
    }

    if(typeof module !== "undefined" && module.exports) {
        module.exports = createEnv;
    } else {
        root["KANAPL"] = createEnv;
    }
})(this);

