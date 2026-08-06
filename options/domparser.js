// https://stackoverflow.com/questions/13969655/how-do-you-check-whether-the-given-ip-is-internal-or-not
function isPrivateIP(ip) {
    var parts = ip.split('.');
    return parts[0] === '10' || 
       (parts[0] === '172' && (parseInt(parts[1], 10) >= 16 && parseInt(parts[1], 10) <= 31)) || 
       (parts[0] === '192' && parts[1] === '168');
}

(function(){
    'use strict';

    const { basicSetup, EditorView } = CM["codemirror"];
    const { javascript, javascriptLanguage, scopeCompletionSource } = CM["@codemirror/lang-javascript"];
    const { json, jsonLanguage } = CM["@codemirror/lang-json"];
    const { EditorState }  = CM["@codemirror/state"];

    let $submitButton = $('#submitButton');
    let $submitMessage = $('#submitMessage');
    
    function errorSubmitMessage(msg) {
        $submitMessage.removeClass('text-success').addClass('text-danger');
        $submitMessage.html(msg);
        $submitButton.prop('disabled', false);
    }

    function successSubmitMessage(msg) {
        $submitMessage.removeClass('text-danger').addClass('text-success');
        $submitMessage.html(msg);
        $submitButton.prop('disabled', false);
    }

    let domparserEditorView;
    
    storageGet(function(data){
        // domparserEditorView.dispatch({changes: {
        //     from: 0,
        //     to: domparserEditorView.state.doc.length,
        //     insert: data.custom_domparser_json
        // }})

        let docText = data?.custom_domparser_json || "\n";

        domparserEditorView = new EditorView({
            doc: docText + "\n",
            extensions: [
                basicSetup,json(), 
                jsonLanguage.data.of({autocomplete:scopeCompletionSource(globalThis)}),
                EditorView.updateListener.of((v) => {
                    if (v.docChanged) {
                        $submitMessage.empty();
                    }
                })
            ],
            parent: document.querySelector("#domparserJsonEditor")
        });
    });

    $(document).on('submit', '#domparserJsonEditorForm', function(){
        
        $submitButton.prop('disabled', true);

        let codeString = domparserEditorView.state.doc.toString().trim();

        if (codeString !== '') {
            try {
                let config = JSON.parse(codeString);
                if (typeof config !== 'object') {
                    throw new TypeError('JSON 格式不对，请参考内置函数配置。');
                }
                for (let funcname in config) {
                    if (funcname.indexOf('DOMParserFor') !== 0) {
                        throw new TypeError(`函数名要以 DOMParserFor 开头，函数名 <b>${funcname}</b> 不符合格式。`);
                    }
                    let single = config[funcname];
                    if (typeof single !== 'object') {
                        throw new TypeError(`函数值需要是配置对象，函数 <b>${funcname}</b> 不符合格式。`);
                    }

                    if (single?.transServerUrl !== undefined) {
                        let urlobj;
                        try { 
                            urlobj = new URL(single.transServerUrl); 
                        } catch(e) { 
                            throw new TypeError(`函数 <b>${funcname}</b> 的 <b>transServerUrl</b> 网址格式有误。`);
                        }

                        let lastdot = urlobj.hostname.lastIndexOf('.');
                        let allowDomains = ['.example', '.invalid', '.localhost', '.test'];
      
                        if (
                            lastdot > 0 && ! isPrivateIP(urlobj.hostname) && ! allowDomains.includes(urlobj.hostname.substring(lastdot))
                        ) {
                            throw new TypeError(`出于安全考虑，转换网址必须是私有网址，如 10.0.0.0/8、172.16.0.0/12、192.168.0.0/16 网段，或 localhost 等无点网址，或 ${allowDomains.join(', ')} 等保留域名。函数 <b>${funcname}</b> 的 <b>transServerUrl</b> 不符合此要求。`);
                        }

                    } else {
                        let checkProps = ['itemSelectors', 'linkSelectors'];
                        for (let i=0; i<checkProps.length; i++) {
                            let type = checkProps[i];
                            if (! single?.[type] || typeof single[type] !== 'object' || single[type].length <= 0) {
                                throw new TypeError(`函数 <b>${funcname}</b> 配置不全，选择器模式必须包含 ${checkProps.join('、')} 及其对应规则。`);
                            }
                        }

                        for (let type in single) {
                            let selectors = single[type];
                            for (let i=0; i<selectors.length; i++) {
                                let selector = selectors[i];
                                if (! selector?.name) {
                                    throw new TypeError(`函数 <b>${funcname}</b> 的 <b>${type}</b> 包含 <b>name</b> 为空的无效选择器。`);
                                }
                            }
                        }

                        try {
                            // 仅测试 selector 语法有没错误，不测试能否匹配到内容，所以用设置网页就可以
                            domparserCallback(single, document.documentElement.outerHTML);
                        } catch (err) {
                            throw new TypeError(`函数 <b>${funcname}</b> 没能通过解析测试：${err.message}。`);
                        }

                    }
                }

            } catch (error) {
                errorSubmitMessage('保存失败：' + error.message);
                return false;
            }
        }

        storageSet({
            'custom_domparser_json': codeString
        }, function(){
            successSubmitMessage('保存成功');
        });
   
        return false;
    });

    fetch('defaultDomparserConfig.json').then(function(response){
        return response.text();
    }).then(function(response){
        new EditorView({
            doc:response,
            extensions: [
                EditorState.readOnly.of(true),
                basicSetup,json(), 
                jsonLanguage.data.of({autocomplete:scopeCompletionSource(globalThis)})
            ],
            parent: document.querySelector("#defaultDomparserCode")
        });
    });


})();
