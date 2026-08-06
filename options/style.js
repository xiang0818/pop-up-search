
+function($){

    var SECTION_MARKERS = {
        icon: '/* === 图标与浮标区 === */',
        modal: '/* === 搜索小窗区 === */',
        ajax: '/* === AJAX 内部区 === */'
    };

    var editors = {};
    var useCodeMirror = false;

    function splitCss(text) {
        var result = { icon: '', modal: '', ajax: '' };
        if (!text) return result;
        var parts = text.split(/\n?\/\* === /);
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            var endIdx = part.indexOf('*/');
            if (endIdx < 0) continue;
            var header = part.substring(0, endIdx).trim();
            var body = part.substring(endIdx + 2).trim();
            if (header.indexOf('图标') === 0) result.icon = body;
            else if (header.indexOf('搜索小窗') === 0 || header.indexOf('弹窗') === 0) result.modal = body;
            else if (header.indexOf('AJAX') === 0) result.ajax = body;
        }
        return result;
    }

    function combineCss(icon, modal, ajax) {
        var parts = [];
        if (icon && icon.trim()) parts.push(SECTION_MARKERS.icon + '\n' + icon.trim() + '\n*/');
        if (modal && modal.trim()) parts.push(SECTION_MARKERS.modal + '\n' + modal.trim() + '\n*/');
        if (ajax && ajax.trim()) parts.push(SECTION_MARKERS.ajax + '\n' + ajax.trim() + '\n*/');
        return parts.join('\n\n');
    }

    // ── CodeMirror Setup ──
    var EditorView, basicSetup, css, oneDark;

    try {
        var cmCore = window.CM && window.CM["codemirror"];
    } catch(e) {}

    if (cmCore) {
        try { EditorView = cmCore.EditorView; basicSetup = cmCore.basicSetup; } catch(e) {}
        try { css = window.CM["@codemirror/lang-css"].css; } catch(e) {}
        try { oneDark = window.CM["@codemirror/theme-one-dark"].oneDark; } catch(e) {}
        if (EditorView && basicSetup) useCodeMirror = true;
    }

    function createEditor(parentId, initialText) {
        var parent = document.querySelector('#' + parentId);
        if (!parent) return null;

        if (useCodeMirror) {
            var extensions = [basicSetup];
            if (css) extensions.push(css());
            if (oneDark) extensions.push(oneDark);
            extensions.push(EditorView.updateListener.of(function(v) {
                if (v.docChanged) debouncePreview();
            }));
            return new EditorView({
                doc: initialText || '',
                extensions: extensions,
                parent: parent
            });
        } else {
            // Fallback: plain textarea
            var $ta = $('<textarea class="form-control" style="min-height:200px;font-family:monospace;font-size:13px;line-height:1.6"></textarea>');
            $ta.val(initialText || '');
            $ta.on('input', debouncePreview);
            parent.appendChild($ta[0]);
            return $ta[0];
        }
    }

    function getEditorText(editor) {
        if (!editor) return '';
        if (useCodeMirror) return editor.state.doc.toString();
        return $(editor).val() || '';
    }

    function setEditorText(editor, text) {
        if (!editor) return;
        if (useCodeMirror) {
            editor.dispatch({
                changes: { from: 0, to: editor.state.doc.length, insert: text || '' }
            });
        } else {
            $(editor).val(text || '').trigger('input');
        }
    }

    // ── Preview ──
    var previewDebounceTimer = 0;
    function debouncePreview() {
        clearTimeout(previewDebounceTimer);
        previewDebounceTimer = setTimeout(updatePreview, 300);
    }

    function updatePreview() {
        var iconCss = getEditorText(editors.icon);
        var modalCss = getEditorText(editors.modal);
        var combined = (iconCss ? iconCss + '\n' : '') + (modalCss || '');
        $('#hcSearchePopoverCustomStyle').text(combined);
    }

    // ── Icon Upload ──
    function handleIconFile(file) {
        if (!file || !file.type.match(/^image\//)) {
            showTips('请选择图片文件');
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var dataUrl = e.target.result;
            var cssClass = prompt('请输入此图标的 CSS class 名称（如 google、bing）：', 'custom');
            if (!cssClass) return;
            var cssSnippet = '#hcSearcheIcons hcsearche-icon[data-seclass="' + cssClass + '"] {\n' +
                '  font-size: 0;\n' +
                '  background-image: url(\'' + dataUrl + '\');\n' +
                '  background-size: 16px;\n' +
                '  background-repeat: no-repeat;\n' +
                '  background-position: center;\n' +
                '}\n';
            var current = getEditorText(editors.icon);
            var newText = current.trim() ? current.trim() + '\n\n' + cssSnippet : cssSnippet;
            setEditorText(editors.icon, newText);
            showTips('图标 CSS 已生成，请在搜索引擎设置中将图标 class 设为「' + cssClass + '」');
        };
        reader.readAsDataURL(file);
    }

    // ── Init ──
    storageGet(function(items) {
        var customStyle = items.custom_style || '';
        var sections = splitCss(customStyle);
        var hasMarkers = customStyle.indexOf(SECTION_MARKERS.icon) >= 0;

        if (!hasMarkers && customStyle.trim()) {
            sections.modal = customStyle.trim();
        }

        editors.icon = createEditor('cssEditorIcon', sections.icon);
        editors.modal = createEditor('cssEditorModal', sections.modal);
        editors.ajax = createEditor('cssEditorAjax', items.custom_ajaxapp_style || '');

        setTimeout(updatePreview, 500);

        window.styleapp = new Vue({
            el: '#styleapp',
            data: {
                custom_style_on: items.custom_style_on
            },
            watch: {
                custom_style_on: function(newVal) {
                    storageSet({ custom_style_on: newVal }, showTips);
                }
            }
        });
    });

    // ── Events ──
    $('#saveStyles').on('click', function() {
        var iconCss = getEditorText(editors.icon);
        var modalCss = getEditorText(editors.modal);
        var ajaxCss = getEditorText(editors.ajax);
        var combined = combineCss(iconCss, modalCss, ajaxCss);

        if (combined.length >= 8192) {
            showAlert(
                '保存失败：代码最多 8192 字节，当前已超出 ' + (combined.length - 8192) + ' 字节，请精简后再试。',
                'danger'
            );
            return;
        }
        if (ajaxCss.length >= 8192) {
            showAlert(
                '保存失败：AJAX 内部样式最多 8192 字节，当前已超出 ' + (ajaxCss.length - 8192) + ' 字节。',
                'danger'
            );
            return;
        }

        storageSet({
            custom_style: combined,
            custom_ajaxapp_style: ajaxCss
        }, function() {
            showTips('样式已保存');
            updatePreview();
        });
    });

    $('#iconUploadBtn').on('click', function() {
        $('#iconFileInput').trigger('click');
    });

    $('#iconFileInput').on('change', function() {
        var file = this.files[0];
        if (file) handleIconFile(file);
        this.value = '';
    });

    $('#cssEditorIcon').closest('.card').on('dragover', function(e) {
        e.preventDefault();
        $(this).addClass('border-primary');
    }).on('dragleave', function(e) {
        $(this).removeClass('border-primary');
    }).on('drop', function(e) {
        e.preventDefault();
        $(this).removeClass('border-primary');
        var file = e.originalEvent.dataTransfer.files[0];
        if (file) handleIconFile(file);
    });

}(jQuery);
