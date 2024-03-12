window.addEventListener("load", event => {
    const expId = document.getElementById("exp");
    const okId = document.getElementById("ok");
    const resultId = document.getElementById("result");
    const parser = epee.piParser(text => resultId.textContent = text);

    okId.addEventListener("click", ev => {
        try {
            parser(expId.value);
        } catch(e) {
            if(e instanceof epee.MyError) {
                resultId.textContent = e.message;
            } else {
                throw e;
            }
        }
    });
});

