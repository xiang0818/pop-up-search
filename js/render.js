/**
 * options 是保存的设置
 * selectionObject 是选中文本和坐标
 */

let POPOVER_ID = 'hcSearchePopover';
let MODAL_ID = 'hcSearcheModal';

function getModalElement() {
    return document.getElementById(MODAL_ID);
}

/**
 * isFixed 是否相对浏览器可视区域定位
 * newPos 是否更新定位（如果元素已经存在的话
 */
function render(tagName, elemId, childElem, isFixed, newPos, mouseX, mouseY) {
    
    let isNewElem = false;
    let elem = document.getElementById(elemId);
    
    if (elem) {
        elem.innerHTML = '';
    } else {
        isNewElem = true;
        elem = document.createElement(tagName);
        elem.id = elemId; 
        document.body.appendChild(elem);
    }
    
    let contentNode = createContainer(tagName + '-container', childElem);
    
    elem.appendChild(contentNode);

    // class ID same
    elem.classList.add(elemId);
    
    let curpos = {
        'top': null,
        'left': null,
        'bottom': null,
        'right': null
    };

    if (! newPos) {
        for (let key in curpos) {
            if (elem.style[key] !== null) {
                curpos[key] = elem.style[key].replace('px', '');
            }
        }
    }

    for (let key in curpos) {
        if (curpos[key] === null || curpos[key] === '') {
            delete curpos[key];
        }
    }

    // 没有位置的按鼠标位置计算一个
    if (Object.keys(curpos).length <= 0) {

        let showWithContextMenu = elemId === POPOVER_ID && options.popup_icon_listener === 'contextmenu';
        if (showWithContextMenu) {
            isFixed = true;
        }
        let pos = getXY(mouseX, mouseY, elem, showWithContextMenu);

        curpos = {
            'top': pos.Y,
            'left': pos.X,
            'bottom': null,
            'right': null
        };
        
        // 相对文档定位时需要将文档滚动距离加上
        if (isFixed === false) {
            curpos['top'] += window.scrollY;
        }
    }

    // 2023 固定位置设置
    if (elemId === MODAL_ID && options.fixed_position && isNewElem) {

        elem.style.position = 'fixed';

        let possets = {
            'top': 0,
            'left': 0,
            'bottom': 0,
            'right': 0
        };

        for (let key in possets) {
            let poppos = parseInt((options['popup_pos_'+key] || 0));
            if (poppos > 0) {
                possets[key] = poppos;
            }
        }

        // 上方设置优先
        if (possets['top'] > 0) {
            elem.style.top = possets['top'] + 'px';
            elem.style.bottom = null;
        } else if (possets['bottom'] > 0) {
            elem.style.top = null;
            elem.style.bottom = possets['bottom'] + 'px';
        }

        // 左方设置
        if (possets['left'] > 0) {
            elem.style.left = possets['left'] + 'px';
            elem.style.right = null;
        } else if (possets['right'] > 0) {
            elem.style.left = null;
            elem.style.right = possets['right'] + 'px';
        }

    } else {

        elem.style.position = isFixed ? 'fixed' : 'absolute';

        for (let key in curpos) {
            elem.style[key] = curpos[key] === null ? null : curpos[key] + 'px';
        }
    }

    setTimeout(function () {
        elem.classList.add(elemId + '-show');
    }, 10);
    
    return elem;
}

/**
 * 悬浮图标总是相对当前文档定位
 * 因为跨域 iframe 没法准确获取光标在整个网页中的位置
 * 用 topClientX 反而降低可用性
 */
function renderPopover(childElem) {
    return render('hcsearche-popover', POPOVER_ID, childElem, false, true, selectionObject.clientX, selectionObject.clientY);
}

/**
 * 搜索窗口可以根据设置决定是相对文档还是相对窗口定位
 * 小窗总是在 main frame 渲染，所以用 topClientX
 * 坐标不准也不要紧，实时定位用的还是比较少，因为小窗固定位置是最优设置
 */
function renderModal(childElem, newPos) {
    return render('hcsearche-modal', MODAL_ID, childElem, options.fixed_modal, newPos, selectionObject.topClientX, selectionObject.topClientY);
}

// containsCheckElem 检查是否模板内元素，是就不移除
function removeTemplate(elemId, containsCheckElem=false) {
    const temp = document.getElementById(elemId);
    if (! temp) {
        return;
    }

    let doRemove = true;
    if (containsCheckElem) {
        let contained = temp.contains(containsCheckElem);
        if (contained) {
            doRemove = false;
        } else {
            let checkElem = containsCheckElem;
            while (checkElem) {
                if (checkElem.dataset?.childof === elemId) {
                    doRemove = false;
                    break;
                }
                if (checkElem?.parentElement) {
                    checkElem = checkElem.parentElement;
                } else {
                    break;
                }
            }
        }
    }

    if (doRemove) {
        temp.classList.remove(elemId + '-show');
        setTimeout(function () {
            if (temp.classList.contains(elemId + '-show') === false && temp.parentElement) {
                document.body.removeChild(temp);
            }
        }, 500);
    }
}

// 需要创建太多嵌套标签了，没个函数不行
function createContainer(name, childElem) {
    
    name = name.toLowerCase();
    let elem = document.createElement(name);
    
    elem.style.display = 'block';
    
    // id 改成驼峰式
    elem.id = name.replace('hcsearche', 'hcSearche').replace(/\-[a-z]/g, function(w){
        return w.replace('-', '').toUpperCase();
    });
    
    if (childElem) {
        if (Array.isArray(childElem) === false)
            childElem = [childElem];
        for (let i=0; i<childElem.length; i++)
            elem.appendChild(childElem[i]);
    }
    
    return elem;
}

function addModal(queryText, seIndex, isAjaxApp, seUrlOrObject, newPos) {

    isAjaxApp = isAjaxApp || typeof seUrlOrObject === 'object';

    let ajaxAppID = 0;

    let headerNode = createContainer('hcsearche-modal-header');
    let footerNode = createContainer('hcsearche-modal-footer');
    let bodyNode = createContainer('hcsearche-modal-body');
    let iframeNode = document.createElement('iframe');

    // header link
    let linksNode = createContainer('hcsearche-modal-links');

    for (var i = 0; i<options.searchEngines.length; i++) {
        let se = options.searchEngines[i];
        
        // 赋值方便下面按统一格式使用
        se.index = i;

        let linkNode = document.createElement('hcsearche-link');
        linkNode.setAttribute('title', se.name + ' ' + se.type.toUpperCase());
        linkNode.setAttribute('data-seindex', se.index);
        linkNode.setAttribute('data-seclass', se.icon_class);
        linkNode.innerHTML = se.name;
        
        if (seIndex == se.index)
             linkNode.setAttribute('data-securrent', 'true');
        
        if (se.type == 'newtab') {
            linkNode.innerHTML += `
            <svg class="afterText" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 18">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 11v4.833A1.166 1.166 0 0 1 13.833 17H2.167A1.167 1.167 0 0 1 1 15.833V4.167A1.166 1.166 0 0 1 2.167 3h4.618m4.447-2H17v5.768M9.111 8.889l7.778-7.778"/>
  </svg>
            `;
            
        }
        
        linkNode.addEventListener('click', function(){
            openEngine(queryText, se);
        });
        
        linksNode.appendChild(linkNode);
    }
    
    // close button
    linksNode.appendChild(createLinkNode(
        'hcSearcheClose',
        '',
        `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
        </svg>`,
        function (node) {
            node.addEventListener('click', function() {
                removeTemplate(MODAL_ID);
            });
        }
    ));

    linksNode.appendChild(createLinkNode(
        'hcSearcheCollapse',
        '',
        `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 18">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1M1 9h14M2 5h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>
        </svg>`,
        function (node) {
            node.addEventListener('click', function() {
                let smallHeight = '450px';

                if (iframeNode.style.height === smallHeight) {
                    iframeNode.style.height = iframeNode.dataset.rawheight;
                } else {
                    iframeNode.dataset.rawheight = iframeNode.offsetHeight + 'px';
                    iframeNode.style.height = smallHeight;
                }

                let smallWidth = 'auto';
                if (bodyNode.style['min-width'] === smallWidth) {
                    bodyNode.style['min-width'] = bodyNode.dataset.rawwidth;
                } else {
                    bodyNode.dataset.rawwidth = bodyNode.offsetWidth + 'px';
                    bodyNode.style['min-width'] = smallWidth;
                }

            });
        },
    ));

    linksNode.appendChild(createLinkNode(
        'hcSearcheMinus',
        '',
        `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 2">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h16"/>
      </svg>`,
        function (node) {
            node.addEventListener('click', function() {
                if (iframeNode.style.display === 'none') {
                    iframeNode.style.display = 'block';
                    footerNode.style.display = 'block';
                } else {
                    iframeNode.style.display = 'none';
                    footerNode.style.display = 'none';
                }
            });
        },
        
    ));
    
    headerNode.appendChild(linksNode)

    // iframe
    iframeNode.id = 'hcSearcheIframe';
    iframeNode.setAttribute('width', '100%');
    iframeNode.setAttribute('frameborder', '0');
    iframeNode.setAttribute('style', 'border:0;display:block');
    iframeNode.setAttribute('referrerpolicy', 'no-referrer');
    if (isAjaxApp) {
        // 设置一个随机字符串作为唯一ID，给后台判断
        ajaxAppID = Math.random().toString(36).substring(2);

        iframeNode.srcdoc = createFrameDoc({
            'selectionText': queryText,
            'searchEngine': options.searchEngines[seIndex],
            'ajaxAppID': ajaxAppID
        }, options.custom_ajaxapp_style, options.custom_domparser_code);
    } else {
        iframeNode.src = seUrlOrObject;
    }

    bodyNode.appendChild(iframeNode);
    
    if (options?.popup_width && parseInt(options.popup_width) > 0) {
        bodyNode.style['width'] = null;
        bodyNode.style['min-width'] = options.popup_width + 'px';
    }
    if (options?.popup_height && parseInt(options.popup_height) > 0) {
        iframeNode.style.height = options.popup_height + 'px';
    }

    // https://iconoir.com/
    // https://flowbite.com/icons/

    footerNode.appendChild(createLinkNode(
        true, 
        '允许点击网页任意位置关闭小窗', 
        getLockSvg(options.auto_close), 
        function(node){
            node.addEventListener('click', function() {
                options.auto_close = options.auto_close === true ? false : true;
                this.innerHTML = getLockSvg(options.auto_close);
            });
        }
    ));

    footerNode.appendChild(createLinkNode(
        true, 
        '临时移到左侧',
        `<svg stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" ><path d="M15 6L9 12L15 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        function (node) {
            node.addEventListener('click', function() {
                let modal = getModalElement();
                let modalOffset = modal.getBoundingClientRect();

                // 以屏幕一半（相当于左侧屏幕）减去小窗宽度，剩余空间四分之一为左侧偏移
                let percent25 = Math.floor((window.innerWidth/2 - Math.floor(modalOffset.width))/4);

                let offsetX = percent25 < 0 ? 0 
                            : modalOffset.left <= percent25 ? 20 
                            : percent25;

                modal.style.left = offsetX+'px';
                modal.style.right = null;
            });
        }
    ));

    footerNode.appendChild(createLinkNode(
        true, 
        '临时移到右侧', 
        `<svg stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" ><path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        function (node) {
            node.addEventListener('click', function() {
                let modal = getModalElement();
                let modalOffset = modal.getBoundingClientRect();

                // 以屏幕一半（相当于左侧屏幕）减去小窗宽度，剩余空间四分之一为左侧偏移
                let percent25 = Math.floor((window.innerWidth/2 - Math.floor(modalOffset.width))/4);
                let offsetX = percent25;
                if (percent25 < 0) {
                    offsetX = 0;
                } else {
                    let currentRight = false;
                    if (modal.style.right && modal.style.right.indexOf('px') > 0) {
                        currentRight = modal.style.right.replace('px', '');
                    } else {
                        // 兼容没有 right 值时，不准，因为 window 宽度是包括滚动条的
                        currentRight = window.innerWidth - modalOffset.right;
                    }
                    if (currentRight !== false && currentRight <= percent25) {
                        offsetX = 20
                    }
                }

                modal.style.right = offsetX+'px';
                modal.style.left = null;
            });
        }
    ));
    
    footerNode.appendChild(createLinkNode(
        true, 
        '展开更多设置', 
        `<svg viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor"><path d="M13 6L19 12L13 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M5 6L11 12L5 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        function (node) {
            node.addEventListener('click', function() {
                footerNode.toggleAttribute('enabled-more-options')
            });
        }
    ));

    footerNode.appendChild(createLinkNode(
        true, 
        '增加高度', 
        `<svg stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor"><path d="M18 12L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 16V22M12 22L15 19M12 22L9 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 8V2M12 2L15 5M12 2L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        function (node) {
            node.setAttribute('single-more-option', true);
            node.addEventListener('click', function() {
                iframeNode.style.height = (iframeNode.offsetHeight+20) + 'px';
            });
        }
    ));

    footerNode.appendChild(createLinkNode(
        true, 
        '增加宽度',
        `<svg style="transform: rotate(90deg);" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor"><path d="M18 12L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 16V22M12 22L15 19M12 22L9 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 8V2M12 2L15 5M12 2L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        function (node) {
            node.setAttribute('single-more-option', true);
            node.addEventListener('click', function() {
                bodyNode.style['min-width'] = (bodyNode.offsetWidth+20)+ 'px';
                bodyNode.style['width'] = null;
            });
        }
    ));

    footerNode.appendChild(createLinkNode(
        true, 
        '减少高度', 
        `<svg stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor"><path d="M18 2L6 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M18 22L6 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 5V10M12 10L15 7M12 10L9 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 19V14M12 14L15 17M12 14L9 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        function (node) {
            node.setAttribute('single-more-option', true);
            node.addEventListener('click', function() {
                iframeNode.style.height = (iframeNode.offsetHeight-20) + 'px';
            });
        }
    ));

    footerNode.appendChild(createLinkNode(
        true, 
        '减少宽度', 
        `<svg style="transform: rotate(90deg);" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor"><path d="M18 2L6 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M18 22L6 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 5V10M12 10L15 7M12 10L9 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 19V14M12 14L15 17M12 14L9 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        function (node) {
            node.setAttribute('single-more-option', true);
            node.addEventListener('click', function() {
                bodyNode.style['min-width'] = (bodyNode.offsetWidth-20)+ 'px';
                bodyNode.style['width'] = null;
            });
        }
    ));

    footerNode.appendChild(createLinkNode(
        true, 
        '记住当前尺寸（保存到设置）', 
        `<svg stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor"><path d="M3 19V5C3 3.89543 3.89543 3 5 3H16.1716C16.702 3 17.2107 3.21071 17.5858 3.58579L20.4142 6.41421C20.7893 6.78929 21 7.29799 21 7.82843V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19Z" stroke="currentColor" stroke-width="1.5"></path><path d="M8.6 9H15.4C15.7314 9 16 8.73137 16 8.4V3.6C16 3.26863 15.7314 3 15.4 3H8.6C8.26863 3 8 3.26863 8 3.6V8.4C8 8.73137 8.26863 9 8.6 9Z" stroke="currentColor" stroke-width="1.5"></path><path d="M6 13.6V21H18V13.6C18 13.2686 17.7314 13 17.4 13H6.6C6.26863 13 6 13.2686 6 13.6Z" stroke="currentColor" stroke-width="1.5"></path></svg>`,
        function (node) {
            node.setAttribute('single-more-option', true);
            node.addEventListener('click', function() {
                let newdata = {
                    'popup_height': parseInt(iframeNode.offsetHeight),
                    'popup_width': parseInt(bodyNode.offsetWidth)
                };
                storageSet(newdata, function() {
                    alert('默认窗口尺寸已保存。新打开的小窗都将是这个大小。');
                });
            });
        }
    ));

    footerNode.appendChild(createLinkNode(
        true, 
        '记住当前窗口位置（保存到设置）', 
        `<svg stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor"><path d="M20 10C20 14.4183 12 22 12 22C12 22 4 14.4183 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10Z" stroke="currentColor" stroke-width="1.5"></path><path d="M12 11C12.5523 11 13 10.5523 13 10C13 9.44772 12.5523 9 12 9C11.4477 9 11 9.44772 11 10C11 10.5523 11.4477 11 12 11Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        function (node) {
            node.setAttribute('single-more-option', true);
            node.addEventListener('click', function() {
                let modal = getModalElement();
                let newdata = {};
                ['left', 'right', 'top', 'bottom'].forEach(function(key){
                    let val = modal.style[key] || '0';
                    newdata['popup_pos_'+key] = val.replace('px', '');
                });
                storageSet(newdata, function(){
                    alert('默认位置已保存。新打开的小窗都将在这个位置出现！');
                });
            });
        }
    ));


    let contentNode = createContainer('hcsearche-modal-content', [headerNode, bodyNode, footerNode]);
    let modal = renderModal(contentNode, newPos);
    
    dragElement(modal);

    if (isAjaxApp) {
        chrome.runtime.sendMessage({'executeAjaxAppScript': true, 'matchAjaxAppID': ajaxAppID});
    }

}

function createLinkNode(nodeId, title, innerHtml, createdCallback) {
    let node = document.createElement('hcsearche-link');
    node.id = typeof nodeId === 'string' ? nodeId : (node.tagName+'-'+encodeURIComponent(title));
    node.setAttribute('title', title);
    node.innerHTML = innerHtml;
    if (createdCallback) createdCallback(node);
    return node;
}

/**
 * 限定只在 main frame 渲染小窗
 * 其他 frame 发消息通知主框架渲染
 */
function addModalSync(queryText, seIndex, isAjaxApp, seUrlOrObject, newPos) {
    if (frameInfo.frameId === 0) {
        addModal(queryText, seIndex, isAjaxApp, seUrlOrObject, newPos);
    } else {
        // 只发给 frameId 为 0 的主框架
        chrome.runtime.sendMessage({
            'callFramesFunction': true,
            'target': { 'frameIds': [0] },
            'functionName': 'addModal',
            'functionSets': {
                'args': [queryText, seIndex, isAjaxApp, seUrlOrObject, newPos]
            }
        });
    }
}

function addPopover(queryText) {
    // 缓存冒泡图标元素，避免每次选择都生成一次
    if (! options._popupEnginesNode) {

        options._popupEnginesNode = createContainer('hcsearche-icons');
        options._popupEnginesNode.dataset.queryText = queryText;
        
        for (var i=0; i<options._popupEngines.length; i++) {
            let se = options._popupEngines[i];
            
            let iconNode = document.createElement('hcsearche-icon');
            iconNode.setAttribute('title', se.name + ' ' + se.type.toUpperCase());
            iconNode.setAttribute('data-seindex', se.index);
            iconNode.setAttribute('data-seclass', se.icon_class);
            iconNode.setAttribute('data-setype', se.type.toLowerCase());
            iconNode.innerHTML = se.name;
            
            // 如果不是基于浏览器定位的，每次都更新定位
            let setNewPos = options.fixed_modal !== true;
            iconNode.addEventListener('click', function(){
                openEngine(options._popupEnginesNode.dataset.queryText, se, setNewPos);
            });

            // 其实很容易误触，误触出现小窗还可以，如果打开新标签页那真是突兀
            // 不过既然有人提出，那么加一下设置
            if (options.show_on_hover === true) {
                iconNode.addEventListener('mouseover', function(){
                    openEngine(queryText, se, setNewPos);
                });
            }
            
            options._popupEnginesNode.appendChild(iconNode);
        }

    } else {
        options._popupEnginesNode.dataset.queryText = queryText;
    }

    renderPopover(options._popupEnginesNode);
}

function triggerPopup(event) {
    if (selectionObject.selectionText) {
        addPopover(selectionObject.selectionText);
    } else {
        autoRemoveTemplate(event);
    }

    /**
     * 选中不点击就把鼠标移出 frame 之后冒泡图标还在，这时在其他框架选中的话，已经无法触发此框架的事件了
     * 所以点击在所有框架执行一次 removePopup 确保都删掉，当然除了当前框架
     */
    chrome.runtime.sendMessage({
        'callFramesFunction': true,
        'target': { 'allFrames': true },
        'functionName': 'removePopup',
        'functionSets': {
            'excludeFrameIds': ['self']
        }
    });
}

function removePopup() {
    removeTemplate(POPOVER_ID, false);
}

function getLockSvg(autoclose) {
    return autoclose 
    ? `<svg data-childof="`+MODAL_ID+`" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.5 8V4.5a3.5 3.5 0 1 0-7 0V8M8 12.167v3M2 8h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/>
  </svg>`
    : `<svg data-childof="`+MODAL_ID+`" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 20">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.5 8V4.5a3.5 3.5 0 1 0-7 0V8M8 12v3M2 8h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/>
  </svg>`
    ;
}

// newPos 用来判断要不要修改窗口定位
// 划词搜索时需要，点击窗口链接时不用
function openEngine(queryText, se, newPos = false) {
    if (se) {
        if (se.type === 'ajax' || se.type === 'domparser') {

            addModalSync(queryText, se.index, true, se, newPos);
            
        } else {

            let queryUrl = queryUrlFormat(
                se.url,
                queryText, 
                1,
                window.location.hostname
            );
            
            if (se.type === 'iframe') {
                addModalSync(queryText, se.index, false, queryUrl, newPos);
                
            } else {
                // 最简单的新窗口打开
                window.open(queryUrl, '_blank', 'noopener,noreferrer');
            }
        }
    }
}

/**
 * 注意！！！
 * 不要在这里直接插入 <script> 代码，否则会受 CSP 限制在部分网页不可用！
 */
function createFrameDoc(seConfig, appStyle, domparserCode) {

    let baseUrl = chrome.runtime.getURL('/');

    let searchConfigJsonBase64 = utf8ToBase64(JSON.stringify(seConfig));
    let domparserCodeBase64 = utf8ToBase64(domparserCode);

    let html = `<!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8">
            <meta name="ajaxAppId" content="${seConfig.ajaxAppID}" />
            <meta name="optionsBaseUrl" content="${baseUrl}" />
            <meta name="searchConfigJsonBase64" content="${searchConfigJsonBase64}" />
            <meta name="domparserCodeBase64" content="${domparserCodeBase64}" />
            <link rel="stylesheet" href="${baseUrl}css/bootstrap.min.css" />
            <link rel="stylesheet" href="${baseUrl}css/ajaxApp.css" />
            <style>${appStyle}</style>
        </head>
        <body>
            <div id="ajaxApp"></div>
        </body>
    </html>
    `

    return html;
}

{/* <script>
var searchConfig = ${JSON.stringify(seConfig)};
var domparserCode = ${JSON.stringify({'codeString': domparserCode})};
var optionsBaseUrl = "${baseUrl}";
</script>
<script src="${baseUrl}js/static/jquery-3.3.1.min.js"></script>
<script src="${baseUrl}js/functions.js"></script>
<script src="${baseUrl}options/defaultDomparser.js"></script>
<script id="customDomparserCode"></script>
<script>
// 测试语法错误
var customDomparserCodeSyntaxError = false;
try {
    Function(\`function test() { ${domparserCode} }\`);
    customDomparserCodeSyntaxError = false;
    document.getElementById('customDomparserCode').text = domparserCode.codeString;
} catch (error) {
    customDomparserCodeSyntaxError = true;
}
</script>
<script src="${baseUrl}js/ajaxApp.js"></script> */}

function autoRemoveTemplate(e) {

    removePopup();

    /**
     * 只有开启自动关闭才会自动移除搜索窗口
     */
    if (
        options.auto_close === true
    ) {
        removeTemplate(MODAL_ID, e.target);
    }
}

function getXY(mouseX, mouseY, elem, showWithContextMenu, offsetX = 10, offsetY = 10) {

    // 记录上下左右，用来计算空间够不够放
    let curTop = mouseY;
    let curBottom = window.innerHeight - mouseY;
    let curLeft = mouseX;
    let curRight = window.innerWidth - mouseX;

    let onTop = curTop >= elem.offsetHeight;
    let onRight = curRight >= elem.offsetWidth;
    let onTopCenter = false;

    // 在左上角显示图标，即只有左边空间不够才在右边显示
    if (options.show_float_icon_left) {
        onRight = curLeft < elem.offsetWidth;
    }

    // 点击右键触发时，会和右键菜单同时出现，存在位置冲突的时候，需要特别处理
    let contextMenuWidth = options.browser_contextmenu_width;
    let contextMenuHeight = options.browser_contextmenu_height;
    if (showWithContextMenu) {

        let setColStyle = false;

        // 靠近顶部时改到左侧竖排，避免被也在顶部的右键菜单遮住
        if (! onTop) {
            setColStyle = true;
            onRight = false;

            if (curRight < contextMenuWidth) {
                onRight = true;
            }
        }

        // 右键菜单向下展开不够位置时会向上展开
        // 但是右键菜单时长时短，而且JS无法获取到尺寸，无法准确判断在上还是在下
        // 所以设置一个右键菜单触底容错距离，触碰到就把气泡移到左侧
        if (curBottom < contextMenuHeight) {
            setColStyle = true;
            onRight = false;
            onTop = false;
            onTopCenter = true;

            // 靠近右侧时，右键菜单向左展开，这时候气泡要在右侧
            if (curRight < contextMenuWidth) {
                setColStyle = true;
                onRight = true;
                onTop = false;
            }
        }

        if (setColStyle) {
            elem.classList.add('columnStyleOn');
        } else {
            // 元素有缓存，第二次可能刷新定位可能有上一次添加的 classes，这里删除
            elem.classList.remove('columnStyleOn');
        }
    }

    let posTop = 0;
    let posLeft = 0;
    
    if (onTopCenter) {
        // 竖排时以光标位置为垂直中间点
        posTop = curTop - elem.offsetHeight/2;
    } else if (onTop) {
        // 定位在光标上方，要减去元素本身高度，向上留白
        posTop = curTop - elem.offsetHeight - offsetY;
    } else {
        // 定位在光标下方，向下留白
        posTop = curTop + offsetY;
    }

    if (onRight) {
        // 定位在光标右侧，向右留白
        posLeft = curLeft + offsetX;
    } else {
        // 定位在光标左侧，向左留白
        posLeft = curLeft - elem.offsetWidth - offsetX;
    }

    // 防止超出顶部和底部
    posTop = Math.max(posTop, 0);
    posTop = Math.min(posTop, window.innerHeight-elem.offsetHeight);

    // 防止超出左侧和右侧
    posLeft = Math.max(posLeft, 0);
    posLeft = Math.min(posLeft, window.innerWidth-elem.offsetWidth);

    return {
        X : posLeft,
        Y : posTop
    };

}

// https://www.w3schools.com/howto/howto_js_draggable.asp

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "Header")) {
    // if present, the drag is where you move the DIV from:
    document.getElementById(elmnt.id + "Header").onmousedown = dragMouseDown;
    if (document.getElementById(elmnt.id + "Footer")) {
        document.getElementById(elmnt.id + "Footer").onmousedown = dragMouseDown;
    }
  } else {
    // otherwise, move the DIV from anywhere inside the DIV: 
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    
    // 要删掉相反的位置设置，否则会导致元素变形
    elmnt.style.right = null;
    elmnt.style.bottom = null;
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}