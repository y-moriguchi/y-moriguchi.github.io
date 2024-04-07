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

function stringify(array0) {
    var result = [],
        i;

    if(!isArray(array0)) {
        return array0;
    } else if(isString(array0[0])) {
        result = "";
        for(i = 0; i < array0.length; i++) {
            result += array0[i];
        }
    } else {
        for(i = 0; i < array0.length; i++) {
            result[i] = stringify(array0[i]);
        }
    }
    return result;
}

let id = 1;
function getCId() {
    return "collapse" + id++;
}

function putArray(div, array) {
    var result,
        divText,
        divTable,
        divTr,
        divTd,
        i,
        j;

    function tree() {
        var divBody,
            elemP,
            i;

        for(i = 0; i < array.length; i++) {
            const id = getCId();

            divBody = $("<div id='" + id + "' class='collapse ms-3'></div>");
            putArray(divBody, array[i]);
            elemP = $("<p data-bs-toggle='collapse' data-bs-target='#" + id + "' class='mb-0'></p>");
            elemP.text("[＋] " + (i + 1));
            $(elemP).click(function(e) {
                var txt = $(this).text();

                if(/^\[＋\]/.test(txt)) {
                    txt = txt.replace(/^\[＋\]/, "[－]");
                    $(this).addClass("show");
                } else {
                    txt = txt.replace(/^\[－\]/, "[＋\]");
                    $(this).removeClass("show");
                }
                $(this).text(txt);
            });
            $(div).append(elemP);
            $(div).append(divBody);
        }
    }

    function addClass(div) {
        if($("#border").prop("checked")) {
            div.addClass("apltableHide");
        } else {
            div.addClass("apltable");
        }
    }

    if(!isArray(array)) {
        divText = $("<div></div>");
        divText.text(array);
        $(div).append(divText);
    } else if(!isArray(array[0])) {
        divText = $("<div></div>");
        result = "";
        for(i = 0; i < array.length; i++) {
            if(i > 0) {
                result += " ";
            }
            result += array[i].toString();
        }
        divText.text(result);
        $(div).append(divText);
    } else if(!isArray(array[0][0])) {
        divTable = $("<table></table>");
        addClass(divTable);
        for(i = 0; i < array.length; i++) {
            divTr = $("<tr></tr>");
            addClass(divTr);
            for(j = 0; j < array[i].length; j++) {
                divTd = $("<td></td>");
                addClass(divTd);
                divTd.text(array[i][j]);
                divTr.append(divTd);
            }
            divTable.append(divTr);
        }
        $(div).append(divTable);
    } else {
        tree();
    }
}

function initPallete(div, textarea) {
    var i;

    for(i = 0; i < MAP_APL_CHAR.length; i++) {
        (function(ch, vec) {
            var btn = $("<span class='apl-pallete-btn'></span>");

            btn.text(ch);
            btn.attr("title", vec[2]);
            btn.uitooltip({
                show: false,
                hide: false
            });
            btn.click(function() {
                var sentence = textarea.val(),
                    pos = textarea.prop("selectionStart"),
                    posEnd = textarea.prop("selectionEnd"),
                    before = sentence.substring(0, pos),
                    after = sentence.substring(posEnd, sentence.length);

                sentence = before + ch + after;
                textarea.val(sentence);
                textarea.focus();
                textarea.prop("selectionEnd", pos + 1)
                textarea.prop("selectionStart", pos + 1)
            });
            $(div).append(btn);
        })(MAP_APL_CHAR[i][0], MAP_APL_CHAR[i]);
    }
}

var MAP_APL_CHAR = [
    [ "←", "←", "Assign" ],
    [ "→", "→", "Branch" ],
    [ "\u00af", "￣", "Negative Sign" ],
    [ "×", "×", "Multiplication" ],
    [ "÷", "÷", "Division" ],
    [ "\u2308", "「", "Max" ],
    [ "\u230a", "」", "Min" ],
    //[ "★", "★", "Exponential" ],
    [ "\u235f", "☆", "Logarithm" ],
    [ "○", "○", "Trigonometric Function" ],
    [ "≧", "≧", "More than" ],
    [ "≦", "≦", "Less than" ],
    [ "≠", "≠", "Not Equal" ],
    [ "\u223c", "\u223c", "Logical Not" ],
    //[ "～", "～", "Logical Not" ],
    [ "∧", "∧", "Logical And" ],
    [ "∨", "∨", "Logical Or" ],
    [ "\u2372", "†", "Logical Nand" ],
    [ "\u2371", "†", "Logical Nor" ],
    [ "\u233f", "/[0]", "Fold First Axis" ],
    [ "\u2340", "\\[0]", "Scan First Axis" ],
    [ "\u2218", "・", "Outer Product" ],
    [ "↑", "↑", "Take" ],
    [ "↓", "↓", "Drop" ],
    [ "\u233d", "φ", "Rotate" ],
    [ "\u2349", "〆", "Transpose" ],
    [ "∈", "∈", "Is Element" ],
    [ "\u234b", "♯", "Sort(Ascending)" ],
    [ "\u2352", "♭", "Sort(Descending)" ],
    [ "\u2339", "※", "Inverted Matrix" ],
    [ "⊥", "⊥", "Encode" ],
    [ "\u22a4", "┬", "Decode" ],
    [ "\u234e", "♪", "Execute" ],
    [ "\u2355", "◆", "To String" ],
    [ "\u2373", "\u2373", "Iota" ],
    [ "\u2374", "\u2374", "Rank" ],
    [ "\u235d", "\u235d", "Comment" ],
    [ "∇", "∇", "Function" ]
];

const maxHistory = 100;

//window.localStorage.removeItem("APLLang");
function history(key) {
    const storage = JSON.parse(window.localStorage.getItem(key));
    let pool = storage ?? [];
    let pointer = storage ? storage.length - 1 : -1;
    if(storage) {
        $("#program").val(pool[pointer]);
    }

    const me = {
        next: function() {
            if(pointer < 0 || pointer + 1 >= pool.length) {
                return null;
            } else {
                return pool[++pointer];
            }
        },
        prev: function() {
            if(pointer <= 0) {
                return null;
            } else {
                return pool[--pointer];
            }
        },
        valid: () => [pointer < 0 || pointer + 1 >= pool.length, pointer <= 0],
        push: v => {
            if(pool.length > 0 && pool.at(-1) === v) {
                return me;
            }
            pool.push(v);
            pool = pool.slice(-maxHistory);
            pointer = pool.length - 1;
            window.localStorage.setItem(key, JSON.stringify(pool));
            return me;
        }
    };

    return me;
}

const hist = history("APLLang");

function workspacePackage(key) {
    const storage = JSON.parse(window.localStorage.getItem(key));
    let pool = storage || {};
    let wsid = null;

    const me = {
        wsid: function(name) {
            wsid = name;
        },

        save: function(name) {
            const wname = name || wsid;

            if(!wname) {
                throw new Error("WORKSPACE ERROR");
            }
            pool[name] = kanapl.getEnv();
            window.localStorage.setItem(key, JSON.stringify(pool));
        },

        load: function(name) {
            if(!pool[name]) {
                throw new Error("WORKSPACE ERROR");
            }
            kanapl.setEnv(pool[name]);
        },

        lib: function() {
            $("#result").empty();
            putArray($("#result"), Object.keys(pool));
        },

        drop: function(name) {
            if(!name) {
                throw new Error("WORKSPACE ERROR");
            }
            delete pool[name];
            window.localStorage.setItem(key, JSON.stringify(pool));
        }
    };

    return me;
}

const workspace = workspacePackage("APLWS");

function workspaceCommand(command) {
    var cmd = command.split(/[ \t　]+/);

    if(!workspace[cmd[0].toLowerCase()]) {
        throw new Error("WORKSPACE ERROR");
    } else if(cmd[1]) {
        workspace[cmd[0].toLowerCase()](cmd[1]);
    } else {
        workspace[cmd[0].toLowerCase()]();
    }
}

function disableIf() {
    const [next, prev] = hist.valid();

    $("#hnext").prop("disabled", next);
    $("#hprev").prop("disabled", prev);
}

var kanapl = KANAPL({});
kanapl.setLog(function(result) { putArray($("#result"), result); });
kanapl.setOutputHook(function(result) {
    return $("#string").prop("checked") ? stringify(result) : result;
});

disableIf();
$(function() {
    initPallete($("#pallete"), $("#program"));

    $("#exec").click(function(e) {
        var programs = $("#program").val().split(/\n/),
            result,
            errmsg,
            i;

        try {
            if(programs.length === 0) {
                // do nothing
            } else if(programs[0].startsWith(")")) {
                workspaceCommand(programs[0].slice(1));
            } else {
                hist.push($("#program").val());
                $("#result").empty();
                result = kanapl.evalAll(programs);
                //putArray($("#result"), result);
            }
        } catch(e) {
            if(/ERROR$/.test(e.message)) {
                $("#result").empty();
                errmsg = $("<div class='errormsg'></div>");
                errmsg.text(e.message);
                $("#result").append(errmsg);
            } else {
                throw e;
            }
        }
    });

    $("#program").keydown(function(ev) {
        if(ev.shiftKey && ev.keyCode === 13) {
            $("#exec").click();
            return false;
        }
    });

    $("#hprev").click(function(e) {
        $("#program").val(hist.prev());
        disableIf();
    });

    $("#hnext").click(function(e) {
        $("#program").val(hist.next());
        disableIf();
    });
});

