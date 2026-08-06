window.addEventListener('message', function (event) {

    if (event.data?.getHtmlResponse || event.data?.getJsonResponse) {
        chrome.runtime.sendMessage(event.data, function(data) {
            window.postMessage({
                ajaxAppListenerResponse: true,
                request: event.data,
                response: data
            });
        });
    } else if (event.data?.ajaxAppContentRefresh) {

        let imgs = this.document.querySelectorAll('img');
        for (let i=0; i<imgs.length; i++) {
            let img = imgs[i];
            if (! img.dataset.src || img.dataset.loading) continue;
            img.dataset.loading = true;
            
            // data url 也要通过 content script 插入是因为直接插入也可能被部分 CSP 拒绝
            if (img.dataset.src.indexOf('data:') === 0) {
                img.src = img.dataset.src;
            } else {

                // 要通过后台读取，前台可能有 CORS 问题
                chrome.runtime.sendMessage({
                    getResponseAsDataUrl: true,
                    fetchUrl: img.dataset.src
                }, function(dataurl) {
                    img.src = dataurl;
                });
            }
        }

    }

}, false);

(async function() {

    let response = await fetch(chrome.runtime.getURL('/options/defaultDomparserConfig.json'));
    let defaultDomparserConfig = await response.json();

    let customDomparserConfig = {};
    if (options?.custom_domparser_json) {
        try {
            customDomparserConfig = JSON.parse(options.custom_domparser_json);
        } catch (error) {
        }
    }

    // 通知页面已经可以交互
    window.postMessage({
        'ajaxAppListenerReady': true,
        'defaultDomparserConfig': defaultDomparserConfig,
        'customDomparserConfig': customDomparserConfig
    });

})();

