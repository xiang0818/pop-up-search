/**
 * 此文件在所有 frame 执行
 */

// 当前页面框架信息，可用来区分是哪个框架
// frameInfo.frameId === 0 是 main frame
let frameInfo;
let isMainFrame;

/**
 * selectionText 当前选中的文本，不包括在输入框内选中
 * clientX 在当前框架内的坐标
 * clientY
 * topClientX 用 frameElement 计算在主框架的坐标，跨域时无法计算
 * topClientY
 */
let selectionObject = {
    'selectionText': '',
    'clientX': 0,
    'clientY': 0,
    'topClientX': 0,
    'topClientY': 0,
};

// 读取设置，根据设置决定用不用插入代码
let options = [];
options._storageOnChanged = false;

function getOptionsForContentScripts(callback) {
    chrome.storage.sync.get(defaultConfig, function(items) {
        options = optionsFormat(items);
        if (callback) callback();
    });
}

/**
 * 先清理，再添加
 */
function updatePopupListener() {
    document.removeEventListener('mouseup', mouseUpListener);
    document.removeEventListener('mouseup', autoRemoveTemplateListener);
    document.removeEventListener('contextmenu', mouseUpListener);
    if (options?.popup_icon_listener !== 'none' && options._popupEngines.length > 0) {
        if (options.popup_icon_listener === 'contextmenu') {
            document.addEventListener('mouseup', autoRemoveTemplateListener);
            document.addEventListener('contextmenu', mouseUpListener);
        } else {
            document.addEventListener('mouseup', mouseUpListener);
        }
    }
}

// 如果没有显示气泡的搜索引擎，初始化时不会添加事件
// 这里提供一个全局函数给右键菜单创建小窗时同时添加事件
function addAutoRemoveTemplateListener() {
    document.removeEventListener('mouseup', autoRemoveTemplateListener);
    document.addEventListener('mouseup', autoRemoveTemplateListener);
}

/**
 * 划词后，如果点击选中文本来取消选择 getSelection() 还是有值
 * 导致实际已经取消选择，可还误以为有选中
 * 但如果延迟些许再判断，就没有了
 * 真是奇了怪了，目前不懂原理，先这样解决
 */
function mouseUpListener(event) {
    setTimeout(function(){
        updateSelectionObject(event);
        triggerPopup(event);
    }, 1);
}

function updateSelectionObject(event) {

    // e.screenX 在 iframe 内也能获取到基于屏幕的坐标，但是只有屏幕坐标没法判断在可视区域的位置
    // 所以还是要用页面元素坐标计算出在可视区域的位置
    // 但如果 iframe 存在跨域限制，也是判断不了的
    let topX = event.clientX;
    let topY = event.clientY;
    if (! isMainFrame) {
        let topwin = window;
        while (topwin?.frameElement) {
            let rect = topwin.frameElement.getBoundingClientRect();
            topX += rect.left;
            topY += rect.top;
            topwin = topwin.parent;
        }
    }

    let selectionText = window.getSelection().toString().trim();
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        selectionText = '';
    }

    // update
    selectionObject = {
        'selectionText': selectionText,
        'clientX': event.clientX,
        'clientY': event.clientY,
        'topClientX': topX,
        'topClientY': topY,
    };
}

function autoRemoveTemplateListener(event) {
    updateSelectionObject(event);
    autoRemoveTemplate(event);
}

// 问后台要 frame 信息，后台会插入用于渲染的脚本
chrome.runtime.sendMessage(
    {
        'frameSayHello': true
    },
    function(response) {
        // console.log(response)
        frameInfo = response;
        isMainFrame = frameInfo.frameId === 0;
        getOptionsForContentScripts(updatePopupListener);
    }
);

// 实时同步最新设置
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        getOptionsForContentScripts(function(){
            updatePopupListener();
            if (options._storageOnChanged) {
                options._storageOnChanged(changes);
            }
        });
    }
});