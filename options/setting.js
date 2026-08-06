
+function($){

    let options;

    storageGet(function(items) {

        options = items;
        
        // 每次打开设置页面都重新排序并更新好 index
        options.searchEngines = reSort(options.searchEngines);
        storageSet(options);

        window.pageapp = new Vue({
            el: '#pageapp',
            data: options,
            watch: {
                $data: {
                    handler: function(newdata) {
                        
                        // console.log(JSON.stringify(newdata))
                        // console.log(newdata)

                        storageSet(newdata, showTips);

                    },
                    deep: true
                }
            },
            methods: {
                sortByPosition: function(arr) {
                    return sortByColumn(arr, 'position');
                }
            }
        });

    });

    function sortByColumn(arr, name) {
        return arr.slice().sort(function(a, b) {
            return a[name] - b[name];
        });
    }
    
    // 按 position 排序之后将按 index 重置 position
    function reSort(searchEngines) {
        searchEngines = sortByColumn(searchEngines, 'position');
        for (var i = 0; i<searchEngines.length; i++) {
            searchEngines[i].position = i;
        }
        return searchEngines;
    }
    
    // 交换位置
    function swapPos($a, $b) {

        let aIndex = $a.attr('data-seindex');
        let bIndex = $b.attr('data-seindex');
        let aPos = $a.attr('data-position');
        let bPos = $b.attr('data-position');
        
        options.searchEngines[aIndex].position = bPos;
        options.searchEngines[bIndex].position = aPos;

        options.searchEngines = reSort(options.searchEngines);
    }
    
    $(document).on('click', '.moveSeUp, .moveSeDown', function(e){

        let $this = $(this).parents('.search_engine');
        let $sibling = $(this).hasClass('moveSeUp') ? $this.prev() : $this.next();

        if ($sibling.length === 0) {
            showTips('已经到末位啦');
        } else {
            swapPos($this, $sibling);
        }
        
        return false;
    });

    const formDefaultConfig = {
        index: 'new',
        name: '',
        url: '',
        type: 'ajax',
        icon_class: 'search'
    };
            
    window.formapp = new Vue({
        el: '#formapp',
        data: copyAsData(formDefaultConfig)
    });
    
    // 不知道为什么直接用 formDefaultConfig 赋值无效，所以这样做了
    function setFormDefaultConfig() {
        for (var key in formDefaultConfig) {
            formapp._data[key] = formDefaultConfig[key];
        }
    }
    
    let $modal = $('#customEngineModal');
    let $domparserGroup = $('#engineTypeDomFunctionNameFormGroup');
    
    $modal.on('show.bs.modal', function (e) {
        if (e.relatedTarget.id === 'addCustomEngine') {
            
            setFormDefaultConfig();
            
        } else {
            
            let editIndex = $(e.relatedTarget).attr('data-seindex');
            
            // 去掉数据绑定
            let se = copyAsData(options.searchEngines[editIndex]);
            se.index = editIndex;
            
            for (var key in formDefaultConfig) {
                formapp._data[key] = se[key];
            }

            if (se.type === 'domparser') {
                $domparserGroup.addClass('d-block');
                $domparserGroup.find('input').val(se.domparserFunction).prop('disabled', false);
            }
        }

    });
    
    $modal.on('hidden.bs.modal', function (e) {
        setFormDefaultConfig();
    });
    
    $(document).on('click', '[name="engineType"]', function(){

        if ($(this).val() === 'domparser') {
            $domparserGroup.addClass('d-block');

            let $input = $domparserGroup.find('input');
            $input.prop('disabled', false);

            // 默认值
            if ($input.val() === '') {
                let engineUrl = $('#engineUrl').val();
                let configs = {
                    'https://www.google.com/search?': 'DOMParserForGoogleDefault',
                    'https://cn.bing.com/search?': 'DOMParserForBingDefault',
                    'https://www.bing.com/search?': 'DOMParserForBingDefault',
                    'https://www.baidu.com/s?': 'DOMParserForBaiduDefault',
                };
                for (let match in configs) {
                    if (engineUrl.indexOf(match) === 0) {
                        $input.val(configs[match]);
                    }
                }
            }

        } else {
            $domparserGroup.removeClass('d-block');
            $domparserGroup.find('input').prop('disabled', true);
        }
    });
    
    // 表单提交
    $(document).on('submit', '#customEngineForm', function(e) {

        $modal.modal('hide');
    
        // 去掉数据绑定
        let newConfig = copyAsData(formapp._data);
        let editIndex = newConfig.index;
        delete newConfig.index;
        
        if (
            Number.isInteger(Math.floor(editIndex))
            && options.searchEngines[editIndex]
        ) {
            
            for (var key in newConfig) {
                options.searchEngines[editIndex][key] = newConfig[key];
            }
            
        } else {

            newConfig.show_icon = true;
            newConfig.position = (copyAsData(options.searchEngines).length + 1);
            
            options.searchEngines.push(newConfig);
        }

        return false;
    });

    $(document).on('click', '#deleteEngine', function() {
        
        if (window.confirm('确定要删除【' + formapp._data.name  + '】搜索引擎吗？')) {
            
            $modal.modal('hide');
            
            let deleteId = formapp._data.index;
            
            // 真方便！
            // Vue.js Niubility!
            // Vue.js MLGB! ( Make Life Greater & Better
            // 我永远爱 Vue.js
            options.searchEngines.splice(deleteId, 1);
        }
        
        return false;
    });
    
    $(document).on('click', '#resetCustomEngine', function() {
        if (window.confirm('你的自定义设置将会被全部删除。确定重置吗？')) {
            options.searchEngines = copyAsData(defaultConfig).searchEngines;
        }
        return false;
    }).on('click', '#appendDefaultEngine', function() {
        options.searchEngines = copyAsData(options).searchEngines.concat(copyAsData(defaultConfig).searchEngines);
        return false;
    });

    $(document).on('click', '#resetAllOptions', function(){
        if (window.confirm('所有自定义设置都会被删除，包括自定义搜索引擎和 DOMParser 函数代码。确定删除吗？')) {
            chrome.storage.sync.clear();
            window.location.reload();
        }
        return false;
    });

    $(document).on('click', '.search_icon_example', function(){
        let seclass = $.trim($(this).find('hcsearche-icon')[0].dataset.seclass);
        formapp._data.icon_class = seclass;
        return false;
    });

    $(document).on('click', '.set_popup_style', function(){
        let data = $(this).data('setting');
        for (let key in data) {
            $('#'+key+'').val(data[key]).trigger('input');
        }
        return false;
    });

}(jQuery)
