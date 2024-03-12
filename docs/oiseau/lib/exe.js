window.addEventListener("load", e => {
    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function log(message) {
        var log0 = $("#log-code").html();
        if(log0.trim() !== "") {
            log0 = log0 + "<br />";
        }
        $("#log-code").html(log0 + escapeHTML(message));
    }

    function exec(prefix) {
        var msg = "";
        var prog = $("#macros").val() + "\n" + prefix + $("#exp").val();
        var lambda = Oiseau({
            log: log
        });
        try {
            $("#log-code").html("");
            $("#result").text(lambda.browser(prog.trim()));
        } catch(e) {
            log(e.message);
        }
    }

    $("#reduce").click(function(e) {
        exec("");
    });

    $("#strict").click(function(e) {
        exec("`");
    });

    $("#nonstrict").click(function(e) {
        exec("``");
    });

    $("#transformT").click(function(e) {
        exec("@");
    });
});

