
+function($){

    storageGet(function(items) {
        
        window.styleapp = new Vue({
            el: '#styleapp',
            data: items,
            watch: {
                custom_style_on: function (newVal) {
                    storageSet({custom_style_on: newVal}, showTips);
                }
            }
        });
        
    });
    
    // 考虑到可能会在输入框内编辑，那样通过监听频繁保存可不好，还是手动保存吧
    $(document).on('submit', '#styleform', function() {
        
        let cssStyle = $(this).find('[name=custom_style]').val().trim();
        let appStyle = $(this).find('[name=custom_ajaxapp_style]').val().trim();
        
        if (cssStyle.length >= 8192) {
            showAlert(
                '保存失败：代码最多8192字节，气泡样式已超过 '+(cssStyle.length - 8192)+' 字节，请修改后再试。', 
                'danger'
            );
        } else if (appStyle.length >= 8192) {
            showAlert(
                '保存失败：代码最多8192字节，AJAX内部样式已超过 '+(cssStyle.length - 8192)+' 字节，请修改后再试。', 
                'danger'
            );
        } else {
            storageSet({custom_style: cssStyle, custom_ajaxapp_style: appStyle}, showTips);
        }

        return false;
    });

}(jQuery)