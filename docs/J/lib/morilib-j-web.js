function isNumber(anObject) {
    return typeof anObject === "number";
}

function isString(anObject) {
    return typeof anObject === "string";
}

function isArray(anObject) {
    return Array.isArray(anObject);
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

const stack = [];

let id = 1;
function getCId() {
    return "collapse" + id++;
}

function putArray(div, array) {
    var result,
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
        div.addClass("apltableHide");
    }

    function isCubeBox(element) {
        if(J.isBox(element)) {
            return isCubeBox(J.unbox(element));
        } else if(element[0] && J.isBox(element[0])) {
            return element.some(v => isCubeBox(J.unbox(v)));
        } else if(element[0] && element[0][0] && J.isBox(element[0][0])) {
            return element.some(v => v.some(w => isCubeBox(J.unbox(w))));
        } else {
            return isArray(element) && isArray(element[0]) && isArray(element[0][0]);
        }
    }

    function addElement(div, element) {
        if(!J.isBox(element) && typeof element !== "object") {
            div.append(element);
        } else {
            const unbox = J.unbox(element);

            div.removeClass("apltableHide");
            div.addClass("apltable");
            if(isCubeBox(unbox)) {
                div.append(enterBox(unbox));
            } else {
                putArray(div, unbox);
            }
        }
    }

    function enterBox(element) {
        const boxed = $("<button class='btn btn-warning btn-sm'>Boxed</button>");

        boxed.click(ev => {
            $("#prev").prop("disabled", false);
            $("#result").empty();
            stack.push(array);
            putArray(div, element);
        });
        $("#prev").off("click");
        $("#prev").click(ev => {
            $("#result").empty();
            putArray(div, stack.pop());
            if(stack.length === 0) {
                $("#prev").prop("disabled", true);
            }
        });
        return boxed;
    }

    if(!isArray(array)) {
        if(J.isBox(array)) {
            putArray(div, [array]);
        } else if(J.isNoun(array)) {
            $(div).text(array === true ? 1 : array === false ? 0 : array);
        } else {
            $(div).text(J.toString(array));
        }
    } else if(!isArray(array[0])) {
        divTable = $("<table></table>");
        addClass(divTable);
        divTr = $("<tr></tr>");
        addClass(divTr);
        for(i = 0; i < array.length; i++) {
            divTd = $("<td></td>");
            addClass(divTd);
            addElement(divTd, array[i] === true ? 1 : array === false ? 0 : array[i]);
            divTr.append(divTd);
        }
        divTable.append(divTr);
        $(div).append(divTable);
    } else if(!isArray(array[0][0])) {
        divTable = $("<table></table>");
        addClass(divTable);
        for(i = 0; i < array.length; i++) {
            divTr = $("<tr></tr>");
            addClass(divTr);
            for(j = 0; j < array[i].length; j++) {
                divTd = $("<td></td>");
                addClass(divTd);
                addElement(divTd, array[i][j] === true ? 1 : array === false ? 0 : array[i][j]);
                divTr.append(divTd);
            }
            divTable.append(divTr);
        }
        $(div).append(divTable);
    } else {
        tree();
    }
}

const maxHistory = 100;

//window.localStorage.removeItem("JLang");
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

const hist = history("JLang");

function disableIf() {
    const [next, prev] = hist.valid();

    $("#hnext").prop("disabled", next);
    $("#hprev").prop("disabled", prev);
}

var J = MorilibJ();

$("#prev").prop("disabled", true);
disableIf();
$(function() {
    $("#exec").click(function(e) {
        hist.push($("#program").val());
        disableIf();
        try {
            const result = J.exec($("#program").val().trim());

            $("#prev").prop("disabled", true);
            $("#result").empty();
            putArray($("#result"), $("#string").prop("checked") ? stringify(result) : result);
        } catch(e) {
            if(e instanceof J.Exception) {
                const errmsg = $("<div style='color: red'></div>");

                errmsg.text(e.message);
                $("#result").empty();
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

