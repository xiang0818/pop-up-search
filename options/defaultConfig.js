
/**
 * @param boolean in_the_menu 添加划词右键菜单
 * @param boolean show_float_icon 划词显示搜索图标
 * @param boolean show_contextmenu_icon 划词后点击右键才出现搜索图标
 * 
 * @param boolean popup_icon_listener 代替上面已遗弃设置
 * 
 * @param boolean show_float_icon_left 默认在左边显示图标
 * @param boolean show_on_hover 鼠标移至搜索图标打开搜索窗口
 * @param boolean browser_contextmenu_width 浏览器自带右键菜单宽度
 * @param boolean browser_contextmenu_height 浏览器自带系统右键菜单高度
 * @param boolean auto_close 点击网页任意位置自动关闭搜索窗口
 * @param boolean fixed_modal 基于浏览器可视区域定位搜索窗口
 * @param boolean fixed_position 在固定位置显示搜索窗口
 * @param boolean popup_width 固定小窗宽度
 * @param boolean popup_height 固定小窗高度
 * @param boolean popup_pos_top 固定 top 偏移
 * @param boolean popup_pos_right 固定 right 偏移
 * @param boolean popup_pos_left 固定 left 偏移
 * @param boolean popup_pos_bottom 固定 bottom 偏移
 * @param boolean custom_style_on 自定义样式生效
 * @param boolean custom_style 自定义样式
 * @param boolean custom_domparser_json 自定义 domparser 代码
 * @param boolean searchEngines 搜索引擎
 */

var defaultConfig = {

    // 已遗弃
    // 右键菜单通过搜索引擎设置开启
    // 图标显示方式由 popup_icon_listener 代替
    in_the_menu: false,
    show_float_icon: true,
    show_contextmenu_icon: false,

    /**
     * 决定如何出现浮窗图标
     * mouseup 代表划词自动显示
     * contextmenu 代表划词后点击右键显示
     * none 代表不显示，即便存在开启悬浮图标的搜索引擎设置
     */
    popup_icon_listener: 'mouseup',

    show_float_icon_left: false,
    show_on_hover: false,
    
    browser_contextmenu_width: 280,
    browser_contextmenu_height: 320,
    auto_close: false,
    fixed_modal: true,
    fixed_position: true,
    popup_width: 450,
    popup_height: 500,
    popup_pos_top: 150,
    popup_pos_right: 300,
    popup_pos_left: 0,
    popup_pos_bottom: 0,
    custom_style_on: true,
    custom_style: '',
    custom_ajaxapp_style: '',
    custom_domparser_json: '',
    searchEngines: [
        {
            name: 'Google',
            position: 1,
            show_icon: true,
            show_in_contextmenu: true,
            url: 'https://www.google.com/search?ie=UTF-8&sourceid=chrome&q=${query}&start=${first}',
            type: 'domparser',
            domparserFunction: 'DOMParserForGoogleDefault',
            icon_class: 'google'
        },
        {
            name: 'Bing',
            position: 2,
            show_icon: true,
            show_in_contextmenu: false,
            url: 'https://cn.bing.com/search?q=${query}&first=${first}',
            type: 'domparser',
            domparserFunction: 'DOMParserForBingDefault',
            icon_class: 'bing'
        },
        {
            name: '百度',
            position: 3,
            show_icon: true,
            show_in_contextmenu: false,
            url: 'https://www.baidu.com/s?ie=utf-8&wd=${query}&pn=${first}',
            type: 'domparser',
            domparserFunction: 'DOMParserForBaiduDefault',
            icon_class: 'baidu'
        }
    ]
};


