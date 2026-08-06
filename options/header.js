(function(){
    let template = `
    <nav class="navbar navbar-expand-lg navbar-light">
      <a class="navbar-brand" href="/options/setting.html"><img src="/images/icon32.png" alt="" width="28" height="28"> 划词小窗搜索</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
    
      <div class="collapse navbar-collapse" id="navbarSupportedContent">
        <ul class="navbar-nav ml-auto">
          <li class="nav-item active">
            <a class="nav-link" href="/options/setting.html">常规设置</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/options/style.html">样式</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/options/domparser.html">DOMParser</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/options/webdav.html">WebDAV</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/options/help.html">帮助</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="/options/about.html">关于</a>
          </li>
        </ul>
      </div>
    </nav>
    `

    template += `
    <div class="container">
    <div class="mb-4 text-center page_mod fade">
        <h4 class="text-muted">${document.title}</h4>
    </div>
    </div>
`

    document.write(template);
})();
