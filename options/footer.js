
(function(){
    let template = `
        <footer class="text-center text-small">
            <p class="mb-2 text-muted">&copy; 2019-2024 Namesc</p>
            <ul class="list-inline">
                <li class="list-inline-item"><a href="setting.html">常规设置</a></li>
                <li class="list-inline-item"><a href="style.html">自定义样式</a></li>
                <li class="list-inline-item"><a href="domparser.html">DOMParser</a></li>
                <li class="list-inline-item"><a href="webdav.html">WebDAV 备份</a></li>
                <li class="list-inline-item"><a href="help.html">使用帮助</a></li>
                <li class="list-inline-item"><a href="about.html">关于</a></li>
            </ul>
        </footer>
    `

    document.write(template);
})();


// 公共文件

var jsfilelist = [
    '/js/static/jquery-3.3.1.min.js',
    '/js/static/bootstrap.min.js',
    // 注意，由于扩展内限制普通 vue 是用不了的，这里用的是 csp 版
    '/js/static/vue-1.0.28-csp.min.js',
    '/js/functions.js',
    'defaultConfig.js',
    'settingCommon.js'
];

document.addEventListener("DOMContentLoaded", function(event) { 
    let footerjs = document.getElementById('footer-js');
    let pagejsfiles = footerjs.getAttribute('page-js-files');
    if (pagejsfiles) {
        jsfilelist = jsfilelist.concat(pagejsfiles.split(','));
    }
    for (let i=0; i<jsfilelist.length; i++) {
        var tag = document.createElement("script");
        tag.src = jsfilelist[i];
        tag.async = false;
        document.body.appendChild(tag);
    }
});
