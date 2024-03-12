const A = Arrycer();

$(function() {
	var code = document.getElementById("code");
	var editor = CodeMirror.fromTextArea(code, {
		mode:  "javascript",
		lineNumbers: true,
		indentUnit: 4
	});
	function isArray(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	}
	function isObject (item) {
		return typeof item === 'object' && item !== null && !isArray(item);
	}
	function println(t) {
		var r = $("#result").val();
		if(r !== null && r !== "") {
			r += "\n";
		}
		$("#result").val(r + t);
	}
	function format(t) {
		var i, res;
		if(typeof t === "string") {
			return '"' + t + '"';
		} else if(isArray(t)) {
			for(i = 0, res = "["; i < t.length; i++) {
				if(i > 0) {
					res += ", ";
				}
				res += format(t[i]);
			}
			res += "]";
		} else if(isObject(t)) {
			res = "{";
			for(i in t) {
				if(t.hasOwnProperty(i)) {
					if(res !== "{") {
						res += ", ";
					}
					res += i + ":" + format(t[i]);
				}
			}
			res += "}";
		} else {
			res = t + "";
		}
		return res;
	}
	console.log = function(t) {
		println("log> " + format(t));
	};
	$("#exec").click(function(ev) {
		var result, t, r;
		try {
			$("#result").val("");
			t = editor.getDoc().getValue();
			result = (1,eval)(t);
			println(format(result));
		} catch(e) {
			$("#result").val("Error Occured");
		}
	});
	$("#clear").click(function(ev) {
		$("#code").val("");
	});
});
