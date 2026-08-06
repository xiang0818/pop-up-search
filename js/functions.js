// 要在不同框架使用的函数
// 部分页面可能会加载两次，所以不要用变量名语法，否则可能会 has already been declared

function utf8ToBase64(utf8str) {
    let encoder = new TextEncoder('utf-8');
    let uint8 = new Uint8Array(encoder.encode(utf8str));
    let latin1 = String.fromCharCode(...uint8);
    let base64str = btoa(latin1);
    return base64str;
}

function base64ToUtf8(base64str) {
    let latin1 = atob(base64str);
    let uint8 = new Uint8Array([...String(latin1)].map(x => x.charCodeAt(0)));
    let utf8str = new TextDecoder('utf-8').decode(uint8);
    return utf8str;
}

function domparserExcludeNodes(node, selector) {
    if (selector?.excludeNodes) {
        let child = node.querySelectorAll(selector.excludeNodes);
        for (let elem of child) {
            elem.remove();
        }
    }
    return node;
}

function domparserSelectorsMatch(selectors, dom) {
    if (! selectors) return;

    // 可能要修改，复制一个来改，防止影响其他查找
    dom = dom.cloneNode(true);
    for (let i in selectors) {
        let selector = selectors[i];

        // 允许选择元素本身，如果选择器是 * 或与当前元素标签同名就认为是选择元素本身
        let find = selector.name === '*' || dom.tagName === selector.name.toUpperCase() ? dom : dom.querySelector(selector.name);
        if (find) {
            // 支持排除一些指定元素，以便获取更准确的内容
            find = domparserExcludeNodes(find, selector);

            let findProperty = selector?.property || 'innerText';

            return {
                'node': find,
                'value': (find?.[findProperty] || find.getAttribute(findProperty))
            };
        }
    }
    return null;
}

function domparserCallback(config, responseHTML) {

    const parser = new DOMParser();
    const doc = parser.parseFromString(responseHTML, "text/html");

    // 删除 script 标签，避免提取 innerText 时提取到其中代码
    let noScriptBody = domparserExcludeNodes(doc.body, {"excludeNodes": "script"});

    let data = [], body = '';

    let items, itemSelector;
    for (let i in config.itemSelectors) {
        itemSelector = config.itemSelectors[i];
        items = noScriptBody.querySelectorAll(itemSelector.name);
        if (items) {
            break;
        }
    }

    if (items) {
        let linkArr = [];
        for (let i=0; i < items.length; i++) {
            let item = domparserExcludeNodes(items[i], itemSelector);

            let link = domparserSelectorsMatch(config.linkSelectors, item);

            // 根据链接去重
            if (! link || linkArr.includes(link.value)) {
                continue;
            } else {
                linkArr.push(link.value);
            }

            if (! config?.titleSelectors) {
                config.titleSelectors = [{
                    "name": "h2,h3,h4"
                }];
            }
            let title = domparserSelectorsMatch(config.titleSelectors, link.node);


            data[i] = {
                'link': link.value,
                'title': domparserTrimText(title?.value || link.node.innerText),
                'snippet': domparserTrimText(domparserSelectorsMatch(config?.snippetSelectors, item)?.value),
                'thumbnail': domparserTrimText(domparserSelectorsMatch(config?.thumbnailSelectors, item)?.value),
                'hostname': domparserTrimText(domparserSelectorsMatch(config?.hostnameSelectors, item)?.value),
            };
            
        }
    }
    
    let hasNextPage = true;
    if (config?.nextPageSelectors) {
        hasNextPage = domparserSelectorsMatch(config.nextPageSelectors, noScriptBody) !== null;
    }

    if (data.length < 1) {
        if (config?.notFoundSelectors) {
            let notfoundText = domparserSelectorsMatch(config.notFoundSelectors, noScriptBody);
            if (notfoundText) {
                body = `<blockquote class="m-4">${notfoundText?.value}</blockquote>`;
                hasNextPage = false;
            }
        }
    }

    return {
        "page_items": data,
        "body": body,
        "next_page": hasNextPage
    };
}

function domparserTrimText(text) {
    return text ? String(text).trim() : text;
}

// 将读取的配置处理成需要的格式，主要是搜索引擎排序和分组
function optionsFormat(options) {
    options._popupEngines = [];
    options._contextmenuEngines = [];
    if (options.searchEngines) {
        options.searchEngines = options.searchEngines.slice().sort(function(a, b) {
            return a['position'] - b['position'];
        });
        for (var i = 0; i<options.searchEngines.length; i++) {
            let se = options.searchEngines[i];
            se.index = i;
            if (se.show_icon === true) {
                options._popupEngines.push(se);
            }
            if (se.show_in_contextmenu) {
                options._contextmenuEngines.push(se);
            }
        }
    }
    return options;
}

/**
 * 替换
 */
function queryUrlFormat(urlFormat, queryText, pageNumber, mainFrameHostname) {
    let queryUrl = urlFormat;
    let queryStr = encodeURIComponent(queryText);

    // 老写法兼容
    queryUrl = queryUrl.replace(new RegExp('%s', 'g'), queryStr);
    queryUrl = queryUrl.replace(new RegExp('%p', 'g'), pageNumber);

    // 新写法
    queryUrl = queryUrl.replace(new RegExp('\\$\\{query\\}', 'g'), queryStr);
    queryUrl = queryUrl.replace(new RegExp('\\$\\{paged\\}', 'g'), pageNumber);

    queryUrl = queryUrl.replace(new RegExp('\\$\\{hostname\\}', 'g'), encodeURIComponent(mainFrameHostname));
    
    // 按数量分页
    let num = (new URL(queryUrl)).searchParams.get('num') || 10;

    // 从 0 开始
    let index = (pageNumber-1)*parseInt(num);
    queryUrl = queryUrl.replace(new RegExp('\\$\\{first\\}', 'g'), index);
    queryUrl = queryUrl.replace(new RegExp('\\$\\{index\\}', 'g'), index);

    // 从 1 开始
    let start = index+1;
    queryUrl = queryUrl.replace(new RegExp('\\$\\{start\\}', 'g'), start);

    return queryUrl;
}

// 删除数据用于测试
// chrome.storage.sync.remove(Object.keys(defaultConfig), function() {});

// 翻译一下可能会出现的错误提示
function alertError(message) {
    message = message.split(' ')[0];
    switch (message) {
        case 'QUOTA_BYTES':
            message = "保存失败：当前设置内容总长度超过了同步存储允许的102,400字节。\n" + 
                      "解决方法：缩短自定义设置的内容。";
        break;
        case 'QUOTA_BYTES_PER_ITEM':
            message = "保存失败：设置子项内容长度超过了同步存储允许的8,192字节。\n" + 
                      "解决方法：找到超出长度的子项并缩短其内容。";
        break;
        case 'MAX_WRITE_OPERATIONS_PER_HOUR':
            message = "保存失败：操作次数超过了同步存储允许的每小时1,800次。\n" + 
                      "解决方法：过一段时间再进行操作。";
        break;
        case 'MAX_WRITE_OPERATIONS_PER_MINUTE':
            message = "保存失败：操作次数超过了同步存储允许的每分钟120次。\n" + 
                      "解决方法：等待一分钟后再进行操作。";
        break;
    }
    alert(message);
};

// 用来防止或消除数据绑定
function copyAsData(obj) {
    let newObj = Object.assign({}, obj);
    return newObj;
};

function storageSet(items, callback) {
    chrome.storage.sync.set(items, function(){
        if (chrome.runtime.lastError) {
            alertError(chrome.runtime.lastError.message);
        } else {
            if (callback)
                callback();
        }
    });
};

// 目前没有获取单项设置的场景，直接省略掉 keys 参数
function storageGet(callback) {
    chrome.storage.sync.get(defaultConfig, function(items) {
        callback(items);
    });
};