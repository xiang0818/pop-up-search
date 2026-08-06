
+function($){

    var WEBDAV_KEY = 'webdav_config';
    var DAV_FILE = 'popup-search-config.json';

    var WEBDAV_PRESETS = {
        custom: { url: '', path: '' },
        jianguoyun: { url: 'https://dav.jianguoyun.com/dav/', path: '' },
        synology: { url: 'https://', path: '', tip: '默认端口 5006，如 https://your-nas:5006/' },
        nextcloud: { url: 'https://', path: '/remote.php/dav/files/', tip: '用户名会作为路径一部分，如 https://example.com/remote.php/dav/files/username/' },
        aliyundrive: { url: 'https://dav.aliyundrive.com/', path: '' },
        '123pan': { url: 'https://dav.123pan.com/', path: '' },
        teracloud: { url: 'https://', path: '', tip: '如 https://xxxx.teracloud.jp/dav/' },
        box: { url: 'https://dav.box.com/dav/', path: '' }
    };

    function getDefaultWebdavConfig() {
        return {
            preset: 'custom',
            url: '',
            path: '',
            user: '',
            pass: '',
            file: DAV_FILE
        };
    }

    function loadWebdavConfig(callback) {
        chrome.storage.sync.get(WEBDAV_KEY, function(data) {
            var config = data[WEBDAV_KEY];
            if (!config || typeof config !== 'object') {
                config = getDefaultWebdavConfig();
            }
            callback(config);
        });
    }

    function saveWebdavConfig(config, callback) {
        var data = {};
        data[WEBDAV_KEY] = config;
        chrome.storage.sync.set(data, callback);
    }

    function buildFullUrl(config) {
        var base = String(config.url || '').trim();
        var path = String(config.path || '').trim();
        if (!base) return '';
        base = base.replace(/\/+$/, '');
        if (path) {
            path = path.replace(/^\/+/, '');
            base = base + '/' + path.replace(/\/+$/, '');
        }
        return joinWebdavUrl(base, config.file);
    }

    function joinWebdavUrl(base, file) {
        var b = String(base || '').trim();
        if (!b) return '';
        if (/\.json(\?|#|$)/i.test(b) && !file) return b;
        b = b.replace(/\/+$/, '');
        var f = String(file || DAV_FILE).trim().replace(/^\/+/, '') || DAV_FILE;
        return b + '/' + f;
    }

    function webdavAuthHeader(config) {
        if (!config.user && !config.pass) return {};
        return { 'Authorization': 'Basic ' + btoa(config.user + ':' + config.pass) };
    }

    function getSettingsJson(callback) {
        chrome.storage.sync.get(null, function(items) {
            delete items[WEBDAV_KEY];
            callback(JSON.stringify(items, null, 2));
        });
    }

    function restoreSettingsJson(jsonText) {
        return new Promise(function(resolve, reject) {
            try {
                var data = JSON.parse(jsonText);
                if (typeof data !== 'object') {
                    reject(new Error('数据格式无效'));
                    return;
                }
                // 先保存当前 WebDAV 配置，避免被云端数据覆盖
                var webdavBackup = null;
                chrome.storage.sync.get(WEBDAV_KEY, function(items) {
                    webdavBackup = items[WEBDAV_KEY];
                    chrome.storage.sync.clear(function() {
                        delete data[WEBDAV_KEY];
                        // 恢复云端数据时，重新注入本地 WebDAV 配置
                        if (webdavBackup) {
                            data[WEBDAV_KEY] = webdavBackup;
                        }
                        chrome.storage.sync.set(data, function() {
                            resolve();
                        });
                    });
                });
            } catch (e) {
                reject(new Error('JSON 解析失败：' + e.message));
            }
        });
    }

    function setStatus(msg, type) {
        var $el = $('#davStatus');
        var cssClass = '';
        if (type === 'ok') cssClass = 'text-success';
        else if (type === 'err') cssClass = 'text-danger';
        else cssClass = 'text-muted';
        $el.removeClass('text-success text-danger text-muted').addClass(cssClass).html(msg);
    }

    function setBusy(busy) {
        $('#davSave, #davTest, #davUpload, #davDownload').prop('disabled', busy);
    }

    function readFormConfig() {
        return {
            preset: $('#davPreset').val(),
            url: $('#davUrl').val().trim(),
            path: $('#davPath').val().trim(),
            user: $('#davUser').val().trim(),
            pass: $('#davPass').val(),
            file: DAV_FILE
        };
    }

    function fillForm(config) {
        $('#davPreset').val(config.preset || 'custom');
        $('#davUrl').val(config.url || '');
        $('#davPath').val(config.path || '');
        $('#davUser').val(config.user || '');
        $('#davPass').val(config.pass || '');
        $('#davFile').val(DAV_FILE);
    }

    // 预设切换
    $('#davPreset').on('change', function() {
        var preset = $(this).val();
        var info = WEBDAV_PRESETS[preset];
        if (info) {
            $('#davUrl').val(info.url || '');
            if (info.path !== undefined) {
                $('#davPath').val(info.path);
            }
            if (info.tip) {
                showTips(info.tip);
            }
        }
        if (preset === 'custom') {
            $('#davUrl').prop('readonly', false);
            $('#davPath').prop('readonly', false);
        } else {
            // 坚果云等固定地址不可修改
            var isFixed = preset === 'jianguoyun' || preset === 'aliyundrive' || preset === '123pan' || preset === 'box';
            $('#davUrl').prop('readonly', isFixed);
        }
    });

    // 页面加载时回填配置
    loadWebdavConfig(function(config) {
        if (!config.preset && config.url === 'https://dav.jianguoyun.com/dav/') {
            config.preset = 'jianguoyun';
        }
        fillForm(config);
        if (config.preset && config.preset !== 'custom') {
            // 修复只读状态
            var isFixed = config.preset === 'jianguoyun' || config.preset === 'aliyundrive' || config.preset === '123pan' || config.preset === 'box';
            $('#davUrl').prop('readonly', isFixed);
        }
    });

    // 保存设置
    $('#davSave').on('click', function() {
        var config = readFormConfig();
        saveWebdavConfig(config, function() {
            showTips('WebDAV 设置已保存');
            var fullUrl = buildFullUrl(config);
            setStatus(
                config.url
                    ? 'WebDAV 已保存 · ' + fullUrl
                    : '已清空 WebDAV 地址',
                'ok'
            );
        });
    });

    // 测试连接
    $('#davTest').on('click', function() {
        var config = readFormConfig();
        var fullUrl = buildFullUrl(config);

        if (!config.url) {
            showTips('请先填写服务器地址');
            setStatus('请先填写服务器地址', 'err');
            return;
        }

        setBusy(true);
        setStatus('正在测试 WebDAV 连接…', '');

        var headers = Object.assign({ 'Accept': '*/*' }, webdavAuthHeader(config));

        // 先 PROPFIND，失败再 GET
        fetch(fullUrl, { method: 'PROPFIND', headers: headers })
            .then(function(res) {
                return { ok: true, status: res.status, url: fullUrl, mode: 'PROPFIND' };
            })
            .catch(function() {
                return fetch(fullUrl, { method: 'GET', headers: Object.assign({ 'Accept': '*/*' }, webdavAuthHeader(config)) })
                    .then(function(res) {
                        return {
                            ok: true,
                            status: res.status,
                            url: fullUrl,
                            mode: 'GET',
                            exists: res.status === 200
                        };
                    });
            })
            .then(function(r) {
                saveWebdavConfig(config);
                var exists = r.exists === false ? '（文件尚不存在，可先上传）'
                    : r.exists ? '（文件已存在）' : '';
                var msg = '连接成功 · HTTP ' + (r.status || '?') + ' · ' + (r.mode || '') + exists;
                showTips('WebDAV 连接成功');
                setStatus(msg, 'ok');
            })
            .catch(function(e) {
                var msg = 'WebDAV 测试失败：' + ((e && e.message) || '未知错误');
                showTips(msg);
                setStatus(msg, 'err');
            })
            .then(function() {
                setBusy(false);
            });
    });

    // 上传备份
    $('#davUpload').on('click', function() {
        var config = readFormConfig();
        var fullUrl = buildFullUrl(config);

        if (!config.url) {
            showTips('请先填写服务器地址');
            setStatus('请先填写服务器地址', 'err');
            return;
        }

        setBusy(true);
        setStatus('正在上传到 WebDAV…', '');

        saveWebdavConfig(config);
        getSettingsJson(function(json) {
            var headers = Object.assign({
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': '*/*'
            }, webdavAuthHeader(config));

            fetch(fullUrl, { method: 'PUT', headers: headers, body: json })
                .then(function(res) {
                    if (res.ok || res.status === 201 || res.status === 204) {
                        var bytes = new Blob([json]).size;
                        showTips('WebDAV 上传成功');
                        setStatus('已上传（' + bytes + ' 字节）· ' + fullUrl, 'ok');
                    } else {
                        throw new Error('HTTP ' + res.status + ' ' + res.statusText);
                    }
                })
                .catch(function(e) {
                    var msg = 'WebDAV 上传失败：' + ((e && e.message) || '未知错误');
                    showTips(msg);
                    setStatus(msg, 'err');
                })
                .then(function() {
                    setBusy(false);
                });
        });
    });

    // 从云端恢复
    $('#davDownload').on('click', function() {
        var config = readFormConfig();
        var fullUrl = buildFullUrl(config);

        if (!config.url) {
            showTips('请先填写服务器地址');
            setStatus('请先填写服务器地址', 'err');
            return;
        }

        if (!window.confirm('将从 WebDAV 下载并覆盖本地所有设置。确定继续吗？')) {
            return;
        }

        setBusy(true);
        setStatus('正在从 WebDAV 下载…', '');

        saveWebdavConfig(config);
        var headers = Object.assign({
            'Accept': 'application/json, text/plain, */*'
        }, webdavAuthHeader(config));

        fetch(fullUrl, { method: 'GET', headers: headers })
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function(text) {
                if (!text || text.trim() === '') throw new Error('远端文件为空');
                return restoreSettingsJson(text);
            })
            .then(function() {
                showTips('已从 WebDAV 恢复设置');
                setStatus('已恢复 · 页面即将刷新', 'ok');
                setTimeout(function() { window.location.reload(); }, 1000);
            })
            .catch(function(e) {
                var msg = 'WebDAV 恢复失败：' + ((e && e.message) || '未知错误');
                showTips(msg);
                setStatus(msg, 'err');
            })
            .then(function() {
                setBusy(false);
            });
    });

}(jQuery);
