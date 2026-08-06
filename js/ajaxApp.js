/**
 * 创建浮窗 iframe 后通知 backgroud 执行此脚本生成网页内容
 */
(async function($) {

    ['optionsBaseUrl', 'searchConfigJsonBase64', 'domparserCodeBase64'].forEach(function(key){
        let meta = document.querySelector('meta[name='+key+']');
        if (meta) {
            window[key] = meta.content || '';
        }
    });
    
    if (window.searchConfigJsonBase64) {
        let searchConfigJson = base64ToUtf8(window.searchConfigJsonBase64);
        var searchConfig = JSON.parse(searchConfigJson);
    }
    
    if (typeof searchConfig !== 'object') return;

    let domparserConfigs = {};
    let currentQuery = {
        'searchEngine': searchConfig.searchEngine,
        'urlFormat': searchConfig.searchEngine.url,
        'queryString': searchConfig.selectionText,
        'pageNumber': 1,
        'queryUrl': '',
        'request': '',
        'response': '',
        'domparser': {
            'name': '',
            'request': '',
            'response': ''
        }
    };
    let typeIsDomparser = currentQuery.searchEngine.type === 'domparser';
    
    let $app = $('#ajaxApp');
    $app.addClass('cse-app');

    function addLoadingBlock() {
        $app.append($('<div id="api-loading"><div class="api-loading-text"><div class="lds-dual-ring"></div>正在获取接口数据</div></div></div>'));
    }

    function removeLoadingBlock() {
        $('#api-loading').remove();
    }

    function addNavbar() {
        let $navbar = $(`
            <nav id="searchNavbar" class="navbar navbar-light bg-light fixed-top">
                <form style="width:100%" id="searchTextForm" class="clearfix" onsubmit="return false" method="post">
                    <div class="input-group input-group-sm">
                        <input id="searchTextInput" name="s" type="text" class="form-control rounded" autocomplete="off" spellcheck="false">
                        <div class="input-group-append ml-3">
                            <a role="button" class="btn btn-outline-secondary rounded" id="searchQueryUrl" ref="noopener noreferrer nofollow" target="_blank" title="在新标签页打开搜索链接">
                            <svg width="1em" height="1em" viewBox="0 0 24 24" stroke-width="1" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor"><path d="M21 3L15 3M21 3L12 12M21 3V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>
                            </a>
                        </div>
                    </div>
                </form>
            </nav>
        `);
        $navbar.find('#searchTextInput').val(currentQuery.queryString);
        $navbar.find('#searchTextForm').on('submit', function(){
            let newquery = $(this).find('[name=s]').val();
            if (newquery.length > 0) {
                currentQuery.queryString = newquery;
                $app.empty();
                addNavbar();
                getPage(1);
            }
            return false;
        });
        $app.append($navbar);
        // 搜索框固定在顶部，用空白占位排版，避免遮住下面的内容
        $app.prepend($('<div/>').css({'width':'100%', 'height':$navbar.outerHeight()}));
    }
    addNavbar();

    function createQueryUrl() {
        currentQuery.queryUrl = queryUrlFormat(
            currentQuery.urlFormat,
            currentQuery.queryString, 
            currentQuery.pageNumber,
            window.top.location.hostname
        );
        if (currentQuery.pageNumber <= 1) {
            $('#searchQueryUrl').attr('href', currentQuery.queryUrl);
        }
        return currentQuery.queryUrl;
    }

    function error2html(error) {

        let error_msg = error?.message ? error.message : typeof error === 'string' ? error : '未知错误';
        switch (error) {
            case 'content-type-error' :
                error_msg = '接口返回内容不是 JSON 格式';
            break;
            case 'json-error' :
                error_msg = '接口返回的 JSON 数据格式有误';
            break;
        }

        let desc = '';

        if (currentQuery.response?.body) {
            desc += `<p>搜索链接响应内容：</p><textarea rows="5" id="currentResponseBody" class="form-control mb-3" readonly>读取中...</textarea>`;
            // 要转义，内容太长，直接转义插入会卡白屏，用 setTimeout 实现异步
            setTimeout(function(){
                $app.find('#currentResponseBody')[0].innerText = currentQuery.response.body;
            }, 1);
        }

        if (currentQuery.domparser.name) {
            desc += `<p>输出内容通过 <b>${currentQuery.domparser.name}</b> 解析</p>`;

            let transServerUrl = domparserConfigs[currentQuery.domparser.name]?.transServerUrl;
            if (transServerUrl) {
                desc += `<p><b>transServerUrl</b>：<a href="${transServerUrl}" ref="noopener noreferrer nofollow" target="_blank">${transServerUrl}</a></p>`;
            }
            if (currentQuery.domparser.response?.body) {
                desc += `<textarea rows="5" id="currentDomparserResponseBody" class="form-control mb-3" readonly>读取中...</textarea>`;
                setTimeout(function(){
                    $app.find('#currentDomparserResponseBody')[0].innerText = currentQuery.domparser.response?.body;
                }, 1);
            }
        }

        return `
            <div class="m-3">
                <h5>出错了！<strong class="text-danger">${error_msg}</strong></h5>
                <p>当前查询链接：<a href="${currentQuery.queryUrl}" ref="noopener noreferrer nofollow" target="_blank">${currentQuery.queryUrl}</a></p>
                ${desc}
                <p>常见接口错误一览：</p>
                <ol>
                    <li>接口链接不可用</li>
                    <li>接口调用受到频率限制</li>
                    <li>接口跨域访问权限有误</li>
                    <li>返回格式有误</li>
                    <li>网络不可用</li>
                </ol>
            </div>
        `;
    }

    function googleCseConvert(data) {
        data.isGoogleCse = data?.queries && data?.items && data?.url && data.url?.template && data.url.template.indexOf('https://www.googleapis.com/customsearch/') === 0;
        if (! data.isGoogleCse) return data;

        if (data.queries?.nextPage) {
            data.next_page = true;
        }

        let results = [];
        for (let i=0; i<data.items.length; i++) {
            let cseitem = data.items[i];
            let pagemap = cseitem?.pagemap;

            results.push({
                'link': cseitem['link'],
                'title': cseitem['title'],
                'snippet': cseitem['snippet'],
                'thumbnail': (pagemap?.cse_thumbnail ? pagemap.cse_thumbnail[0].src : '')
            });
        }

        data.page_items = results;

        // 不加 start 参数，谷歌网页和API这个参数用法不一样
        data.page_url = 'https://www.google.com/search?ie=UTF-8&q=' + encodeURIComponent(data.queries.request[0].searchTerms);

        return data;
    }

    function pagedata2html(data) {

        let request = currentQuery.request;
        if (request?.getHtmlResponse && request?.fetchUrl && ! data?.page_url) {
            data.page_url = request.fetchUrl;
        }

        let itemCount = 0;
        let output = '';

        // 兼容旧名称
        if (! data?.page_items && data?.items) {
            data.page_items = data.items;
        }

        if (data?.page_items) {
            let page_items = data.page_items;
            
            let atag = document.createElement('a');
            output += '<ul class="list-group list-group-flush cse-list">'

            const queryStringRe = new RegExp(escapeRegExp(currentQuery.queryString), 'gi');

            // 不要用 i++ 这样循环，不一定是连续顺序数组
            for (let key in page_items) {
                let item = page_items[key];

                if (! item?.title) continue;

                item['link'] = (new URL(item['link'], currentQuery.queryUrl)).toString();
                item['title'] = escapeText(item['title'] || '');
                item['snippet'] = escapeText(item['snippet'] || '');

                item['snippet'] = item['snippet'].replaceAll(queryStringRe, '<b>$&</b>');

                atag.href = item['link'];

                let shorturl = item?.['hostname'];
                if (! shorturl) {
                    shorturl = atag.hostname;

                    let path = atag.pathname;

                    // 保留一部分路径用于快速辨别内容，比如 语言路径 /en/
                    if (path.length > 1) {
                        // 删除无阅读意义的后缀 .html
                        path = path.replace(/\.(html|shtml|htm|php|asp|jsp|aspx)?$/, '');

                        // 删除 /p/wfia13232 之类的
                        if (path.match(/^\/[a-z]\/[a-z0-9]+$/)) {
                            path = '/';
                        }

                        // 删除纯数字路径，包括带 . - _ 符号的
                        path = path.replace(/(\/[0-9\.\-\_]+)+\/?$/, '/');

                        // 删除拥有5个数字以上的路径，这种基本也是靠ID识别无阅读意义的
                        path = path.replace(/(\/.*?[0-9]{5,30}.*?)+\/?$/, '/');

                        // 删除 /a/ /p/ 类的单字母尾巴
                        path = path.replace(/\/[a-z]\/?$/, '/');

                        if (path.length > 10) {
                            // 如果路径文本包含在标题内，就删掉
                            let wordCleanRe = /(\-|\_|\s|\||\,)+/g;
                            let titleWords = String(item['title']).replaceAll(wordCleanRe, ' ').toLowerCase();
                            let cuts = path.split('/');
                            if (cuts) {
                                let newpath = '';
                                cuts.forEach(function(cut){
                                    if (! cut) return;
                                    if (titleWords.indexOf(cut.replaceAll(wordCleanRe, ' ').toLowerCase()) >= 0) {
                                        newpath += '/..';
                                    } else {
                                        newpath += '/' + cut;
                                    }
                                });
                                path = newpath.replace(/(\/\.\.)+/, '/..').replace(/(\/\.\.)+$/, '');
                            }
                        }

                    }

                    // 如果路径是中英文常见路径，保留它
                    if (path.length > 1 && atag.pathname.match(/^\/(en|zh|zh\-(cn|hans|hant|sg|my|tw|hk|mo)|)\//)) {
                        path = atag.pathname.match(/^(\/[^\/]+\/)/)?.[1];
                    }

                    if (path.length > 1
                        && path.length < 30
                        && (atag.hostname.length + path.length) < 50
                        && path.match(/\//g)?.length <= 3
                    ) {
                        shorturl += path;
                    }

                    // 百度跳转地址展示也无意义，不展示
                    if ((atag.hostname + atag.pathname) === 'www.baidu.com/link') {
                        shorturl = '';
                    }
                }

                let thumbnail = '';
                if (item?.thumbnail) {
                    // 就算缩略图本身就是 data url 了也不要直接插入
                    // 因为有些站点（比如 developer.mozilla.org ） CSP 连这个也是拒绝的，但是由 content script 插入的就可以正常加载
                    let src = `data-src="${item.thumbnail}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="`;
                    thumbnail = `<img ${src} class="cse-img" referrerpolicy="no-referrer">`;
                }
                
                output += `<li class="list-group-item cse-item" data-cse-hostname="${atag.hostname}" data-cse-link="${atag.href}">
                <div class="media cse-media">
                    <div class="media-body cse-media-body">
                        <div class="cse-title"><a class="cse-link" href="${item['link']}" ref="noopener noreferrer nofollow" target="_blank">${item['title']}</a></div>
                        <a class="cse-img-link" href="${item['link']}" ref="noopener noreferrer nofollow" target="_blank">${thumbnail}</a>
                        <div class="cse-desc">${item['snippet']}</div>
                        <a class="cse-url" href="${item['link']}" ref="noopener noreferrer nofollow" target="_blank">${shorturl}</a>
                    </div>
                </div>
                </li>
                `

                itemCount++;
            }

            output += '</ul>'
        }

        if (output.length > 0) {
            let prehtml = '';
            
            let tips = `<span class="cse-keyword">${currentQuery.queryString}</span> - ${currentQuery.searchEngine.name}搜索第${currentQuery.pageNumber}页`;
            if (itemCount > 0) {
                tips += `，共${itemCount}条结果`;
            }
            
            prehtml += '<div class="clearfix cse-pagetips">';
            prehtml += data?.page_url ? '<a href="'+data.page_url+'" ref="noopener noreferrer nofollow" target="_blank" title="在新标签页中打开">'+tips+'</a>' : tips;
            prehtml += '</div>';
        
            output = prehtml + output;
        }

        if (data?.next_page) {
            output += '<div id="api-next-page" class="mt-2 mb-2 cse-next-page"><button class="btn btn-default btn-block">加载下一页</div></div>'
        }

        return output;
    }

    let escape = document.createElement('textarea');
    // 转义，确保不会出现标签
    function escapeText(text) {
        escape.innerText = text;
        return escape.innerHTML;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function getPage(pageNum) {

        // 这个要在第一行，后面函数要用这个全局变量
        currentQuery.pageNumber = pageNum;

        let msgObject = {};

        let parserName = '';
        if (typeIsDomparser) {
            let searchEngine = currentQuery.searchEngine;
            if (! searchEngine?.domparserFunction) {
                showError('此搜索引擎类型为 domparser 但未设置解析函数。');
                return;
            }

            parserName = searchEngine.domparserFunction;
            if (! window[parserName] && typeof window[parserName] !== 'function') {
                showError('此搜索引擎类型的 domparser 解析函数不存在。');
                return;
            }

            msgObject = {
                requestType: 'raw',
                getHtmlResponse: true,
                domparserName: parserName,
                fetchUrl: createQueryUrl()
            };
        } else {
            msgObject = {
                requestType: 'raw',
                getJsonResponse: true,
                fetchUrl: createQueryUrl()
            };
        }

        $('#api-next-page').remove();

        addLoadingBlock();

        postMessage(msgObject);
    }

    function getPageCallback(request, response) {
        removeLoadingBlock();

        if (request?.domparserName) {

            currentQuery.domparser.name = request.domparserName;
            let parser = window[currentQuery.domparser.name];

            try {

                let parserResult = parser(response?.body || response);

                // transServerUrl 异步返回结果
                if (parserResult === true) {
                    return;
                }

                if (typeof parserResult === 'string') {
                    response = {
                        'action': 'hcsearche',
                        'body': parserResult
                    };

                } else if (typeof parserResult === 'object') {
                    response = parserResult;
                }

            } catch (error) {
                showError(currentQuery.domparser.name + " 函数解析出错了。<div><textarea class='form-control' readonly>"+ error.message +"</textarea></div>");
                return;
            }

        }

        pageRender(response);
    }

    function showError(message) {
        $app.append($('<div class="p-4"/>').html(message));
    }

    function pageRender(pagedata) {

        let output = pagedata?.error ? error2html(pagedata.error)
        :  typeof pagedata?.body === 'string' && pagedata.body.length > 0 ? pagedata.body
        : (pagedata = googleCseConvert(pagedata)).isGoogleCse || typeof pagedata === 'object' ? pagedata2html(pagedata)
        : '';

        let newNode = $('<api-result/>').html(output);
        $app.append(newNode);

        // 通知 content script 内容已更改，需要加载图片
        window.postMessage({'ajaxAppContentRefresh': true});
    }

    $(document).on('click', '#api-next-page', function(){
        getPage(currentQuery.pageNumber+1);
    });
    
    window.addEventListener('message', function (event) {
        if (event.data?.ajaxAppListenerReady) {
            // 等待 content script 通知再获取信息

            ['defaultDomparserConfig', 'customDomparserConfig'].forEach(function(configName){
                if (event.data?.[configName]) {
                    let configs = event.data[configName];
                    for (let functionName in configs) {

                        let funConfig = configs[functionName];

                        domparserConfigs[functionName] = funConfig;

                        if (funConfig?.transServerUrl) {
                            
                            window[functionName] = function(responseHTML) {

                                postMessage({
                                    requestType: 'domparser',
                                    getJsonResponse: true,
                                    fetchUrl: funConfig.transServerUrl,
                                    fetchOptions: {
                                        method: "POST",
                                        redirect: "follow",
                                        body: JSON.stringify({
                                            'requestURL': currentQuery.queryUrl,
                                            'responseHTML': responseHTML
                                        })
                                    }
                                });

                                return true;
                            };
                        } else {
                            window[functionName] = function(responseHTML) {
                                return domparserCallback(configs[functionName], responseHTML);
                            };
                        }

                    }
                }
            });

            getPage(1);

        } else if (event.data?.ajaxAppListenerResponse) {

            if (event.data.request.requestType === 'domparser') {
                currentQuery.domparser.request = event.data.request;
                currentQuery.domparser.response = event.data.response;
            } else {
                currentQuery.request = event.data.request;
                currentQuery.response = event.data.response;
            }

            // 处理返回的信息
            if (event.data.response?.error) {
                removeLoadingBlock();
                pageRender(event.data.response);
            } else {
                getPageCallback(event.data.request, event.data.response);
            }
            
        }
    }, false);  
    
    return false;
})(jQuery);
