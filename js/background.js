
/**
 * Qikipedia_v0.1.1 里有删除内容安全策略 Content Security Policies 的代码
 * 先记下，如果有需要用再拿来用，就不用自己研究了，毕竟不了解
 */

// mv3
importScripts('/options/defaultConfig.js');
importScripts('/js/functions.js');

let menusCallbackFunc = [];

function createMenus() {
    chrome.storage.sync.get(defaultConfig, function(items) {

        menusCallbackFunc = [];

        items = optionsFormat(items);
        
        for (let i=0; i<items.searchEngines.length; i++) {

            let se = items.searchEngines[i];
            
            if (se.show_in_contextmenu) {
                
                let menuItemId = 'hcsearche_' + i;
                
                chrome.contextMenus.create({
                    'title': '使用 ' + se.name + ' 搜索',
                    'id': menuItemId,
                    'contexts': ['selection']
                });
                
                menusCallbackFunc[menuItemId] = function(info, tab) {
                    if (tab.url.indexOf('chrome-extension://') === 0) {
                        // 暂不支持在扩展页面搜索
                        chrome.tabs.create({url: chrome.runtime.getURL('/options/notsupport.html')});
                        return;
                    }
                    let selector = { 
                        'tabId': tab.id, 
                        'frameIds': [0] 
                    };

                    // 打开小窗
                    callFramesFunction(selector, 'openEngine', {
                        'args': [info.selectionText, se, false]
                    });

                    // 添加自动移除事件
                    callFramesFunction(selector, 'addAutoRemoveTemplateListener', {});
                }
            }
        }
        
        if (Object.keys(menusCallbackFunc).length > 0)
            chrome.contextMenus.onClicked.addListener(menusCallback);
    });
}

function menusCallback(info, tab) {
    if (menusCallbackFunc[info.menuItemId]) {
        menusCallbackFunc[info.menuItemId](info, tab);
    }
}

function resetContextMenus() {
    // 无论开关都清除右键菜单，如果开了再创建就是
    chrome.contextMenus.removeAll(function(){
        // 先清除事件
        chrome.contextMenus.onClicked.removeListener(menusCallback);
        createMenus();
    });
}

function callFramesFunction(targetSelector, functionName, functionSets) {
    chrome.scripting.executeScript({
        target: targetSelector,
        args: [
            functionName, 
            functionSets
        ],
        injectImmediately: false, // 需要为 false 确保文档JS环境先加载
        func: (fname, fsets) => {

            // 点击同时 iframe 创建但还没 setup 的可能也会先收到消息，这里要判断一下，还没有就不要执行
            if (typeof frameInfo !== 'object') {
                return;
            }

            let frameId = frameInfo.frameId;
            let checkOk = true;

            // 不在这些 frame 执行
            if (fsets?.excludeFrameIds && fsets.excludeFrameIds.includes(frameId)) {
                checkOk = false;
            }

            if (checkOk) {
                if (fsets?.args) {
                    window[fname](...fsets.args);
                } else {
                    window[fname]();
                }
            }
        }
    });
}

chrome.storage.onChanged.addListener(function(changes, areaName) {
    if (areaName === 'sync') {
        if (
            changes.searchEngines !== undefined
        ) {
            resetContextMenus();
        }
    }
});
 
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    
    // 唤醒电脑开发者模式看到 TypeError: Cannot read properties of undefined (reading 'id') 
    // 不知咋回事，判断一下
    if (! sender.tab?.id) return;

    let tabId = sender.tab.id;

    if (request.frameSayHello === true) {

        let selector = {'tabId' : tabId, 'frameIds': [sender.frameId]};
        
        // 在 manifest content_scripts 插入 css 不能覆盖所有 iframe，原因未知
        // 比如 https://www.w3schools.com/tags/tryit.asp?filename=tryhtml_iframe 第一层和第三层可以插入，第二层却没有
        // 所以还是在后台插入，这样可以全覆盖
        chrome.scripting.insertCSS({
            target: selector,
            files: ["/css/popup.css", "/css/icons.css"]
        }).then(function(){

            sendResponse(sender);

            chrome.storage.sync.get(['custom_style_on', 'custom_style'], function(items) {
                let cssCode = '';
                if (items.custom_style_on) {
                    cssCode = items.custom_style;
                }
                
                chrome.scripting.insertCSS({
                    target: selector,
                    css: cssCode,
                });
            });
        });

        // 注意，这里必须返回 true 否则无法异步调用 sendResponse
        return true;

    } else if (request.callFramesFunction === true) {
        
        let targetSelector = {tabId: tabId};

        // 允许通过消息指定 frame 筛选条件
        ['tabId', 'allFrames', 'frameIds', 'documentIds'].forEach(function(key){
            if (request.target?.[key]) {
                targetSelector[key] = request.target[key];
            }
        });

        let functionName = request.functionName;
        let functionSets = request?.functionSets;

        // 允许用 self 代指发送消息的 frame id
        if (functionSets?.excludeFrameIds) {
            for (let i in functionSets.excludeFrameIds) { 
                if (functionSets.excludeFrameIds[i] === 'self') {
                    functionSets.excludeFrameIds[i] = sender.frameId;
                }
            }
        }

        callFramesFunction(targetSelector, functionName, functionSets);

    } else if (request.executeAjaxAppScript === true) {

        /**
         * 创建 iframe 时还不知道 frame id
         * 这里通过 ajaxAppId 来匹配该 frame 确保脚本只在该框架插入
         * 传入 matchAjaxAppID 时会在所有 frame 执行匹配函数
         * 通过匹配的框架会再发一条不带匹配条件的执行消息
         */

        if (request.matchAjaxAppID) {

            chrome.scripting.executeScript({
                target: {tabId: tabId, allFrames: true},
                args: [
                    request.matchAjaxAppID
                ],
                injectImmediately: false,
                func: (matchAjaxAppID) => {
                    let meta = document.querySelector('meta[name="ajaxAppId"]');
                    if (meta && meta.content === matchAjaxAppID) {
                        chrome.runtime.sendMessage({
                            'executeAjaxAppScript': true
                        });
                    }
                }
            });

        } else {

            // 在非隔离环境执行页面代码，等同于在页面引入这些文件
            // 不直接写 iframe <script> 是因为直接写会在部分网站触发 CSP 限制
            chrome.scripting.executeScript({
                target: {
                    tabId: tabId, 
                    frameIds: [sender.frameId]
                },
                injectImmediately: false,
                world: 'MAIN',
                files: [
                    '/js/static/jquery-3.3.1.min.js', 
                    '/js/functions.js', 
                    '/js/ajaxApp.js'
                ],
            }).then(function(){
                chrome.scripting.executeScript({
                    target: {
                        tabId: tabId, 
                        frameIds: [sender.frameId]
                    },
                    files: ['/js/ajaxAppListener.js'],
                });
            });

        }

    } else if (request.getJsonResponse === true && !! request.fetchUrl) {

        // 获取 AJAX 格式响应
        fetch(
            request.fetchUrl, 
            (request.fetchOptions ? request.fetchOptions : {})
        ).then(function(response) {

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.indexOf('application/json') !== -1) {
                return response.json();
            } else {
                return response.text();
            }

        }).then(function(json) {

            if (typeof json !== 'object') {
                try {
                    json = JSON.parse(json);
                } catch (error) {
                    sendResponse({
                        'error': 'content-type-error',
                        'body': json
                    });
                }
            }
            
            if (json && (json?.body || json?.items || json?.page_items)) {
                
                sendResponse(json);
                
            } else {
                
                sendResponse(json && json.error ? json : {
                    'error': 'json-error'
                });
            }

        }).catch(function(err) {

            sendResponse({
                'error': (err instanceof TypeError ? err.message : 'unknow')
            });

        });
        
        // 注意，这里必须返回 true 否则无法异步调用 sendResponse
        return true;

    } else if (request.getHtmlResponse === true && !! request.fetchUrl) {

        // 获取 AJAX 数据
        fetch(request.fetchUrl).then(function(response) {
            return response.text();
        }).then(function(html) {
            sendResponse({
                'body': html
            });
        }).catch(function(err) {
            sendResponse({
                'error': (err instanceof TypeError ? err.message : 'unknow')
            });
        });
        
        // 注意，这里必须返回 true 否则无法异步调用 sendResponse
        return true;

    } else if (request.getResponseAsDataUrl === true && !! request.fetchUrl) {

        // 将响应转 data 链接，给图片用
        fetch(request.fetchUrl, {referrerPolicy: 'no-referrer'}).then(function(response) {
            return response.blob();
        }).then(function(response){
            let reader = new FileReader();
            reader.onload = function(){
                sendResponse(this.result);
            };
            reader.readAsDataURL(response)
        });
        
        // 注意，这里必须返回 true 否则无法异步调用 sendResponse
        return true;
    }

    // 没有返回的话，控制台会警告
    sendResponse({});
});

chrome.runtime.onInstalled.addListener(function() {

    // 只有更改选项较多的大版本才在安装后弹出选项页面
    let versionWelcomeKey = 'version_welcome_4';

    chrome.storage.sync.get(function(items) {
        for (let key in items) {
            if (key.indexOf('version_welcome_') === 0 && key !== versionWelcomeKey) {
                chrome.storage.sync.remove([key]);
            }
        }
        if (! items?.[versionWelcomeKey]) {
            chrome.tabs.create({url: chrome.runtime.getURL('/options/setting.html')}, function() {
                let data = {};
                data[versionWelcomeKey] = (new Date()).toTimeString();
                chrome.storage.sync.set(data);
            });
        }
    });

    resetContextMenus();
});
