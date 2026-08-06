+function($){

    window.showAlert = function(msg, type='success', showclose=true) {

        let close_btn_html = showclose ? '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' : '';
        
        // 加个 alert_break 是为了换行，因为 .alert 为了居中用 inline-block
        // 多个消息弹窗逐个消失往上挤的效果不好，先凑合着用吧
        let $alert = $('<div class="alert alert-'+type+' fade" role="alert">'+ msg + ' '+ close_btn_html + '</div>');
        
        let $alertWrap = $('#alerts');
        if ($alertWrap.length === 0) {
            $alertWrap = $('<div/>').attr('id', 'alerts');
            $('body').append($alertWrap);
        }
        
        $alertWrap.append($alert).append($('<div class="alert_break"></div>'));
        
        // 移除多余的 .alert_break ，因为移除弹窗的时候没有移除
        $('#alerts .alert_break + .alert_break').remove();
        
        setTimeout(function(){
            $alert.addClass('show');
        }, 10)

        return $alert;
    }
    
    // 最多只显示一个的提示
    window.showTips = function(msg = 'updated') {

        let tipsId = 'updateTips';
        
        let $lastTips = $('#'+tipsId);
        if ($lastTips.length > 0) {
            $lastTips.remove();
        }

        if (msg === 'updated')
            msg = '设置修改成功';
        
        let $alert = showAlert(msg);
        
        $alert.attr('id', tipsId);
        
        // 3秒自动移除

        setTimeout(function(){
            $alert.find('[data-dismiss="alert"]').trigger('click');
        }, 3000);
    }

    // 读取数据后再渲染有延迟，会导致闪烁，不喜欢，所以整个页面逐步渐入
    $('.page_mod').each(function(index){
        let $mod = $(this);
        setTimeout(function(){
            $mod.addClass('show');
        }, 200 * index)
    });
    
}(jQuery);

